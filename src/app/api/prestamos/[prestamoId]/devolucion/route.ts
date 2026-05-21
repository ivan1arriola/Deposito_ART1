import { NextResponse } from "next/server";
import { Prisma, TipoMovimiento } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnMovement } from "@/lib/notify-admins";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfter,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { prestamoInclude, serializePrestamoWithActuante, totalUnidadesPrestamo } from "@/lib/prestamos";
import { ensurePrestamoActuanteCompatibility, fetchPrestamoActuanteByMovimientoIds } from "@/lib/prestamo-actuante";

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
  await ensurePrestamoActuanteCompatibility();

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId inválido." }, { status: 400 });
  }

  const body = (await request.json()) as DevolucionPrestamoPayload;
  const fechaDevolucionInput = body.fechaDevolucion?.trim() || getTodayDateInput();
  const fechaDevolucion = parseFechaDevolucion(body.fechaDevolucion);
  if (!fechaDevolucion) {
    return NextResponse.json({ error: "fechaDevolucion inválida." }, { status: 400 });
  }
  if (isDateInputAfterToday(fechaDevolucionInput)) {
    return NextResponse.json({ error: "La fecha de devolución no puede ser futura." }, { status: 400 });
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoInclude,
  });

  if (!existing || existing.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  }

  if (existing.prestamoHistorial) {
    return NextResponse.json({ error: "El préstamo ya fue devuelto." }, { status: 409 });
  }

  if (!existing.prestamoActivo) {
    return NextResponse.json({ error: "El préstamo no tiene estado activo." }, { status: 409 });
  }

  const fechaPrestamoDisplay = formatDateOnlyFromDate(existing.fecha);
  if (fechaPrestamoDisplay && isDateInputAfter(fechaPrestamoDisplay, fechaDevolucionInput)) {
    return NextResponse.json({ error: "La fecha de devolución no puede ser anterior a la fecha del préstamo." }, { status: 400 });
  }

  const devolucionInputByItemId = new Map<string, { estadoDevolucion: "NUEVO" | "BUENO" | "REGULAR" | "MALO"; comentarioDevolucion: string }>();
  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      const itemId = parseBigIntId(item.itemId);
      const estadoDevolucion = parseEstadoEquipoPrestamo(item.estadoDevolucion) ?? "NUEVO";
      const comentarioDevolucion = String(item.comentarioDevolucion ?? "").trim();
      if (!itemId) {
        return NextResponse.json({ error: "items: itemId inválido." }, { status: 400 });
      }
      const key = itemId.toString();
      devolucionInputByItemId.set(key, { estadoDevolucion, comentarioDevolucion });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const itemUpdates = existing.items.map((item) => {
        const itemId = item.itemId.toString();
        const itemUpdate = devolucionInputByItemId.get(itemId) ?? {
          estadoDevolucion: item.estadoEntrega,
          comentarioDevolucion: "",
        };
        return {
          movimientoId: existing.movimientoId,
          itemId: item.itemId,
          estadoDevolucion: itemUpdate.estadoDevolucion,
          comentarioDevolucion: itemUpdate.comentarioDevolucion || null,
        };
      });

      if (itemUpdates.length > 0) {
        const values = Prisma.join(
          itemUpdates.map(
            (entry) =>
              Prisma.sql`(
                CAST(${entry.movimientoId} AS bigint),
                CAST(${entry.itemId} AS bigint),
                CAST(${entry.estadoDevolucion} AS text),
                CAST(${entry.comentarioDevolucion} AS text)
              )`,
          ),
        );

        await tx.$executeRaw`
          UPDATE "movimiento_item" AS mi
          SET
            "estado_devolucion" = CAST(v."estado_devolucion" AS "public"."estado_equipo_prestamo"),
            "comentario_devolucion" = v."comentario_devolucion"
          FROM (
            VALUES ${values}
          ) AS v("movimiento_id", "item_id", "estado_devolucion", "comentario_devolucion")
          WHERE mi."movimiento_id" = v."movimiento_id"
            AND mi."item_id" = v."item_id"
        `;
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
    }, { timeout: 15_000 });

    const updated = await prisma.movimiento.findUniqueOrThrow({
      where: { movimientoId: existing.movimientoId },
      include: prestamoInclude,
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

    try {
      await notifyAdminOnMovement(
        {
          usuarioId: auth.user.usuarioId,
          username: auth.user.username,
          nombre: auth.user.nombre,
          apellido: auth.user.apellido,
          rol: auth.user.rol,
        },
        `Devolución de préstamo ${updated.movimientoId.toString()}.`,
        `/api/prestamos/${encodeURIComponent(updated.movimientoId.toString())}/recibo`,
      );
    } catch {
      // No bloquear devolución por fallas de push.
    }

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    const resumenItems = updated.items
      .slice(0, 4)
      .map((item) => `${item.item.nombre} x${item.cantidad}`)
      .join(", ");
    const resumenItemsLine = updated.items.length > 4 ? `${resumenItems}, ...` : resumenItems;

    const destinatarioPersonalCi = updated.destinatarioPersonal?.personal.ci ?? null;
    if (destinatarioPersonalCi) {
      await Promise.allSettled([
        sendPersonalMovementEmailNotification({
          request,
          ci: destinatarioPersonalCi,
          subject: "Notificación de devolución - Sistema de Depósito General - Artillería 1",
          headline: "Se registró la devolución de un préstamo en tu ficha.",
          detailLines: [
            `Recibo: ${updated.prestamoHistorial?.reciboNumero ?? existing.prestamoActivo.reciboNumero}`,
            `Fecha de devolución: ${formatDateOnlyForDisplay(fechaDevolucionInput)}`,
            `Total de unidades: ${totalUnidadesPrestamo(updated)}`,
            `Items: ${resumenItemsLine}`,
          ],
          actorLabel,
          portalPath: "/",
        }),
      ]);
    }

    const actuanteByMovimientoId = await fetchPrestamoActuanteByMovimientoIds([updated.movimientoId]);
    return NextResponse.json(serializePrestamoWithActuante(updated, actuanteByMovimientoId));
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la devolución del préstamo." }, { status: 500 });
  }
}
