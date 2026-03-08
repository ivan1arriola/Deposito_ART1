import { NextResponse } from "next/server";
import { TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfter,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { prestamoInclude, serializePrestamo, totalUnidadesPrestamo } from "@/lib/prestamos";

type DevolucionPrestamoPayload = {
  fechaDevolucion?: string;
};

function parsePrestamoId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parseFechaDevolucion(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return dateInputToDate(getTodayDateInput());
  return dateInputToDate(raw);
}

export async function PUT(request: Request, context: { params: Promise<{ prestamoId: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId invalido." }, { status: 400 });
  }

  const body = (await request.json()) as DevolucionPrestamoPayload;
  const fechaDevolucionInput = body.fechaDevolucion?.trim() || getTodayDateInput();
  const fechaDevolucion = parseFechaDevolucion(body.fechaDevolucion);
  if (!fechaDevolucion) {
    return NextResponse.json({ error: "fechaDevolucion invalida." }, { status: 400 });
  }
  if (isDateInputAfterToday(fechaDevolucionInput)) {
    return NextResponse.json({ error: "La fecha de devolucion no puede ser futura." }, { status: 400 });
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoInclude,
  });

  if (!existing || existing.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Prestamo no encontrado." }, { status: 404 });
  }

  if (existing.prestamoHistorial) {
    return NextResponse.json({ error: "El prestamo ya fue devuelto." }, { status: 409 });
  }

  if (!existing.prestamoActivo) {
    return NextResponse.json({ error: "El prestamo no tiene estado activo." }, { status: 409 });
  }

  const fechaPrestamoDisplay = formatDateOnlyFromDate(existing.fecha);
  if (fechaPrestamoDisplay && isDateInputAfter(fechaPrestamoDisplay, fechaDevolucionInput)) {
    return NextResponse.json({ error: "La fecha de devolucion no puede ser anterior a la fecha del prestamo." }, { status: 400 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.prestamoHistorial.create({
        data: {
          movimientoId: existing.movimientoId,
          reciboNumero: existing.prestamoActivo?.reciboNumero ?? `PR-${existing.movimientoId.toString().padStart(8, "0")}`,
          fechaDevolucion,
          usuarioRecibeDevolucionId: auth.user.usuarioId,
        },
      });

      await tx.prestamoActivo.delete({
        where: { movimientoId: existing.movimientoId },
      });

      return tx.movimiento.findUniqueOrThrow({
        where: { movimientoId: existing.movimientoId },
        include: prestamoInclude,
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "PRESTAMO",
      entidadId: updated.movimientoId.toString(),
      detalle: {
        evento: "PRESTAMO_DEVUELTO",
        reciboNumero: updated.prestamoHistorial?.reciboNumero ?? existing.prestamoActivo.reciboNumero,
        fechaPrestamo: formatDateOnlyFromDate(updated.fecha),
        fechaDevolucion: formatDateOnlyForDisplay(fechaDevolucionInput),
        totalEquipos: updated.items.length,
        totalUnidades: totalUnidadesPrestamo(updated),
        usuarioRecibeDevolucionId: auth.user.usuarioId,
        items: updated.items.map((item) => ({
          itemId: item.item.itemId.toString(),
          nombre: item.item.nombre,
          cantidad: item.cantidad,
        })),
      },
    });

    return NextResponse.json(serializePrestamo(updated));
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la devolucion del prestamo." }, { status: 500 });
  }
}
