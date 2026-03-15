import { NextResponse } from "next/server";
import { TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { prestamoInclude, totalUnidadesPrestamo } from "@/lib/prestamos";

function parsePrestamoId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ prestamoId: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar prestamos." }, { status: 403 });
  }

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId invalido." }, { status: 400 });
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoInclude,
  });

  if (!existing || existing.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Prestamo no encontrado." }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.movimiento.delete({ where: { movimientoId: prestamoId } });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "PRESTAMO",
      entidadId: existing.movimientoId.toString(),
      detalle: {
        evento: "PRESTAMO_ELIMINADO",
        reciboNumero:
          existing.prestamoHistorial?.reciboNumero ??
          existing.prestamoActivo?.reciboNumero ??
          `PR-${existing.movimientoId.toString().padStart(8, "0")}`,
        estado: existing.prestamoHistorial ? "DEVUELTO" : "PENDIENTE",
        destinatarioCi: existing.personalCi,
        destinatarioNombre: `${existing.personal.apellido1} ${existing.personal.apellido2 ?? ""}, ${existing.personal.nombre1} ${existing.personal.nombre2 ?? ""}`
          .replace(/\s+/g, " ")
          .trim(),
        fechaPrestamo: formatDateOnlyFromDate(existing.fecha),
        fechaDevolucion: existing.prestamoHistorial ? formatDateOnlyFromDate(existing.prestamoHistorial.fechaDevolucion) : null,
        totalEquipos: existing.items.length,
        totalUnidades: totalUnidadesPrestamo(existing),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el prestamo." }, { status: 500 });
  }
}

