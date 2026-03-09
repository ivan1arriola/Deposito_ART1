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
  items?: Array<{
    itemId: string | number;
    estadoDevolucion?: string;
    comentarioDevolucion?: string;
  }>;
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

function parseBigIntId(value: unknown) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function parseEstadoEquipoPrestamo(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "NUEVO") return "NUEVO";
  if (raw === "BUENO") return "BUENO";
  if (raw === "REGULAR") return "REGULAR";
  if (raw === "MALO") return "MALO";
  return null;
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

  const devolucionInputByItemId = new Map<string, { estadoDevolucion: "NUEVO" | "BUENO" | "REGULAR" | "MALO"; comentarioDevolucion: string }>();
  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      const itemId = parseBigIntId(item.itemId);
      const estadoDevolucion = parseEstadoEquipoPrestamo(item.estadoDevolucion) ?? "NUEVO";
      const comentarioDevolucion = String(item.comentarioDevolucion ?? "").trim();
      if (!itemId) {
        return NextResponse.json({ error: "items: itemId invalido." }, { status: 400 });
      }
      const key = itemId.toString();
      devolucionInputByItemId.set(key, { estadoDevolucion, comentarioDevolucion });
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        const itemId = item.itemId.toString();
        const itemUpdate = devolucionInputByItemId.get(itemId) ?? {
          estadoDevolucion: item.estadoEntrega,
          comentarioDevolucion: "",
        };

        await tx.movimientoItem.update({
          where: {
            movimientoId_itemId: {
              movimientoId: existing.movimientoId,
              itemId: item.itemId,
            },
          },
          data: {
            estadoDevolucion: itemUpdate.estadoDevolucion,
            comentarioDevolucion: itemUpdate.comentarioDevolucion || null,
          },
        });
      }

      await tx.prestamoHistorial.create({
        data: {
          movimientoId: existing.movimientoId,
          reciboNumero: existing.prestamoActivo?.reciboNumero ?? `PR-${existing.movimientoId.toString().padStart(8, "0")}`,
          fechaDevolucion,
          fechaEstimadaDevolucionTexto: existing.prestamoActivo?.fechaEstimadaDevolucionTexto ?? null,
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
        fechaEstimadaDevolucionTexto:
          updated.prestamoHistorial?.fechaEstimadaDevolucionTexto ?? existing.prestamoActivo.fechaEstimadaDevolucionTexto ?? null,
        fechaDevolucion: formatDateOnlyForDisplay(fechaDevolucionInput),
        totalEquipos: updated.items.length,
        totalUnidades: totalUnidadesPrestamo(updated),
        usuarioRecibeDevolucionId: auth.user.usuarioId,
        items: updated.items.map((item) => ({
          itemId: item.item.itemId.toString(),
          nombre: item.item.nombre,
          cantidad: item.cantidad,
          estadoEntrega: item.estadoEntrega,
          comentarioEntrega: item.comentarioEntrega,
          estadoDevolucion: item.estadoDevolucion,
          comentarioDevolucion: item.comentarioDevolucion,
        })),
      },
    });

    return NextResponse.json(serializePrestamo(updated));
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la devolucion del prestamo." }, { status: 500 });
  }
}
