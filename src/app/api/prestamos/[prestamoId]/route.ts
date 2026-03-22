import { NextResponse } from "next/server";
import { TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  dateInputToDate,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfter,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { prestamoInclude, serializePrestamo, totalUnidadesPrestamo, type PrestamoWithRelations } from "@/lib/prestamos";

type EditPrestamoPayload = {
  fechaPrestamo?: string;
  fechaEstimadaDevolucionTexto?: string;
  fechaDevolucion?: string;
  comentarios?: string;
  motivo?: string;
  items?: Array<{
    itemId: string | number;
    cantidad?: number | string;
    estadoEntrega?: string;
    comentarioEntrega?: string;
    estadoDevolucion?: string;
    comentarioDevolucion?: string;
  }>;
};

type EstadoEquipoPrestamo = "NUEVO" | "BUENO" | "REGULAR" | "MALO";

type PrestamoAuditSnapshot = {
  reciboNumero: string;
  estado: "PENDIENTE" | "DEVUELTO";
  destinatario: {
    ci: string;
    nombre: string;
  };
  fechaPrestamo: string | null;
  fechaDevolucion: string | null;
  fechaEstimadaDevolucionTexto: string | null;
  comentarios: string | null;
  totalEquipos: number;
  totalUnidades: number;
  items: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    estadoEntrega: EstadoEquipoPrestamo;
    comentarioEntrega: string | null;
    estadoDevolucion: EstadoEquipoPrestamo | null;
    comentarioDevolucion: string | null;
  }>;
};

function parsePrestamoId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parseBigIntId(value: unknown) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function parseCantidad(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseEstadoEquipoPrestamo(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "NUEVO") return "NUEVO";
  if (raw === "BUENO") return "BUENO";
  if (raw === "REGULAR") return "REGULAR";
  if (raw === "MALO") return "MALO";
  return null;
}

function buildPrestamoAuditSnapshot(prestamo: PrestamoWithRelations): PrestamoAuditSnapshot {
  return {
    reciboNumero:
      prestamo.prestamoHistorial?.reciboNumero ??
      prestamo.prestamoActivo?.reciboNumero ??
      `PR-${prestamo.movimientoId.toString().padStart(8, "0")}`,
    estado: prestamo.prestamoHistorial ? "DEVUELTO" : "PENDIENTE",
    destinatario: {
      ci: prestamo.personalCi,
      nombre: `${prestamo.personal.apellido1} ${prestamo.personal.apellido2 ?? ""}, ${prestamo.personal.nombre1} ${prestamo.personal.nombre2 ?? ""}`
        .replace(/\s+/g, " ")
        .trim(),
    },
    fechaPrestamo: formatDateOnlyFromDate(prestamo.fecha),
    fechaDevolucion: prestamo.prestamoHistorial ? formatDateOnlyFromDate(prestamo.prestamoHistorial.fechaDevolucion) : null,
    fechaEstimadaDevolucionTexto:
      prestamo.prestamoHistorial?.fechaEstimadaDevolucionTexto ??
      prestamo.prestamoActivo?.fechaEstimadaDevolucionTexto ??
      null,
    comentarios: prestamo.observaciones ?? null,
    totalEquipos: prestamo.items.length,
    totalUnidades: totalUnidadesPrestamo(prestamo),
    items: prestamo.items.map((item) => ({
      itemId: item.item.itemId.toString(),
      nombre: item.item.nombre,
      cantidad: item.cantidad,
      estadoEntrega: item.estadoEntrega,
      comentarioEntrega: item.comentarioEntrega,
      estadoDevolucion: item.estadoDevolucion,
      comentarioDevolucion: item.comentarioDevolucion,
    })),
  };
}

function buildGeneralChanges(before: PrestamoAuditSnapshot, after: PrestamoAuditSnapshot) {
  const cambios: Record<string, { antes: string | null; despues: string | null }> = {};
  if (before.fechaPrestamo !== after.fechaPrestamo) {
    cambios.fechaPrestamo = { antes: before.fechaPrestamo, despues: after.fechaPrestamo };
  }
  if (before.fechaDevolucion !== after.fechaDevolucion) {
    cambios.fechaDevolucion = { antes: before.fechaDevolucion, despues: after.fechaDevolucion };
  }
  if (before.fechaEstimadaDevolucionTexto !== after.fechaEstimadaDevolucionTexto) {
    cambios.fechaEstimadaDevolucionTexto = {
      antes: before.fechaEstimadaDevolucionTexto,
      despues: after.fechaEstimadaDevolucionTexto,
    };
  }
  if (before.comentarios !== after.comentarios) {
    cambios.comentarios = { antes: before.comentarios, despues: after.comentarios };
  }
  return cambios;
}

function buildItemChanges(before: PrestamoAuditSnapshot, after: PrestamoAuditSnapshot) {
  const beforeByItemId = new Map(before.items.map((item) => [item.itemId, item]));
  return after.items
    .map((item) => {
      const previous = beforeByItemId.get(item.itemId);
      if (!previous) return null;

      const changes: Record<string, { antes: number | string | null; despues: number | string | null }> = {};
      if (previous.cantidad !== item.cantidad) {
        changes.cantidad = { antes: previous.cantidad, despues: item.cantidad };
      }
      if (previous.estadoEntrega !== item.estadoEntrega) {
        changes.estadoEntrega = { antes: previous.estadoEntrega, despues: item.estadoEntrega };
      }
      if (previous.comentarioEntrega !== item.comentarioEntrega) {
        changes.comentarioEntrega = { antes: previous.comentarioEntrega, despues: item.comentarioEntrega };
      }
      if (previous.estadoDevolucion !== item.estadoDevolucion) {
        changes.estadoDevolucion = { antes: previous.estadoDevolucion, despues: item.estadoDevolucion };
      }
      if (previous.comentarioDevolucion !== item.comentarioDevolucion) {
        changes.comentarioDevolucion = {
          antes: previous.comentarioDevolucion,
          despues: item.comentarioDevolucion,
        };
      }

      if (Object.keys(changes).length === 0) return null;
      return {
        itemId: item.itemId,
        nombre: item.nombre,
        changes,
      };
    })
    .filter((entry): entry is { itemId: string; nombre: string; changes: Record<string, { antes: number | string | null; despues: number | string | null }> } => entry !== null);
}

export async function PUT(request: Request, context: { params: Promise<{ prestamoId: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede editar prestamos." }, { status: 403 });
  }

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId invalido." }, { status: 400 });
  }

  const body = (await request.json()) as EditPrestamoPayload;
  const motivo = String(body.motivo ?? "").trim();
  if (!motivo) {
    return NextResponse.json({ error: "Debes indicar el motivo de la edicion." }, { status: 400 });
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoInclude,
  });

  if (!existing || existing.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Prestamo no encontrado." }, { status: 404 });
  }

  const fechaPrestamoActualInput = formatDateOnlyFromDate(existing.fecha) ?? getTodayDateInput();
  const fechaPrestamoInput =
    typeof body.fechaPrestamo === "string" && body.fechaPrestamo.trim() !== ""
      ? body.fechaPrestamo.trim()
      : fechaPrestamoActualInput;
  const fechaPrestamo = dateInputToDate(fechaPrestamoInput);
  if (!fechaPrestamo) {
    return NextResponse.json({ error: "fechaPrestamo invalida." }, { status: 400 });
  }
  if (isDateInputAfterToday(fechaPrestamoInput)) {
    return NextResponse.json({ error: "La fecha del prestamo no puede ser futura." }, { status: 400 });
  }

  const fechaDevolucionActualInput = existing.prestamoHistorial
    ? formatDateOnlyFromDate(existing.prestamoHistorial.fechaDevolucion) ?? getTodayDateInput()
    : null;
  let fechaDevolucionInput = fechaDevolucionActualInput;
  let fechaDevolucion = existing.prestamoHistorial?.fechaDevolucion ?? null;

  if (existing.prestamoHistorial) {
    if (body.fechaDevolucion !== undefined) {
      const rawFechaDevolucion = String(body.fechaDevolucion ?? "").trim();
      if (!rawFechaDevolucion) {
        return NextResponse.json({ error: "fechaDevolucion invalida." }, { status: 400 });
      }
      const parsedFechaDevolucion = dateInputToDate(rawFechaDevolucion);
      if (!parsedFechaDevolucion) {
        return NextResponse.json({ error: "fechaDevolucion invalida." }, { status: 400 });
      }
      if (isDateInputAfterToday(rawFechaDevolucion)) {
        return NextResponse.json({ error: "La fecha de devolucion no puede ser futura." }, { status: 400 });
      }
      fechaDevolucionInput = rawFechaDevolucion;
      fechaDevolucion = parsedFechaDevolucion;
    }
    if (fechaDevolucionInput && isDateInputAfter(fechaPrestamoInput, fechaDevolucionInput)) {
      return NextResponse.json(
        { error: "La fecha de devolucion no puede ser anterior a la fecha del prestamo." },
        { status: 400 },
      );
    }
  } else if (body.fechaDevolucion !== undefined) {
    return NextResponse.json(
      { error: "Solo se puede editar la fecha de devolucion en prestamos ya devueltos." },
      { status: 400 },
    );
  }

  const fechaEstimadaActual =
    existing.prestamoHistorial?.fechaEstimadaDevolucionTexto ??
    existing.prestamoActivo?.fechaEstimadaDevolucionTexto ??
    null;
  const fechaEstimadaDevolucionTexto =
    body.fechaEstimadaDevolucionTexto === undefined
      ? fechaEstimadaActual
      : String(body.fechaEstimadaDevolucionTexto ?? "").trim() || null;
  const comentarios =
    body.comentarios === undefined ? existing.observaciones ?? null : String(body.comentarios ?? "").trim() || null;

  const existingItemsById = new Map(existing.items.map((item) => [item.item.itemId.toString(), item]));
  const itemUpdates = Array.isArray(body.items)
    ? body.items
    : existing.items.map((item) => ({
        itemId: item.item.itemId.toString(),
        cantidad: item.cantidad,
        estadoEntrega: item.estadoEntrega,
        comentarioEntrega: item.comentarioEntrega ?? "",
        estadoDevolucion: item.estadoDevolucion ?? item.estadoEntrega,
        comentarioDevolucion: item.comentarioDevolucion ?? "",
      }));

  if (itemUpdates.length === 0) {
    return NextResponse.json({ error: "Debes incluir al menos un equipo para editar el prestamo." }, { status: 400 });
  }

  const parsedItemUpdates: Array<{
    itemId: bigint;
    cantidad: number;
    estadoEntrega: EstadoEquipoPrestamo;
    comentarioEntrega: string | null;
    estadoDevolucion: EstadoEquipoPrestamo | null;
    comentarioDevolucion: string | null;
  }> = [];

  const seenItemIds = new Set<string>();
  for (const item of itemUpdates) {
    const itemId = parseBigIntId(item.itemId);
    if (!itemId) {
      return NextResponse.json({ error: "items: itemId invalido." }, { status: 400 });
    }
    const itemIdKey = itemId.toString();
    if (seenItemIds.has(itemIdKey)) {
      return NextResponse.json({ error: "No puedes repetir equipos en la edicion del prestamo." }, { status: 400 });
    }
    seenItemIds.add(itemIdKey);

    const existingItem = existingItemsById.get(itemIdKey);
    if (!existingItem) {
      return NextResponse.json({ error: "Solo puedes editar equipos ya incluidos en el prestamo." }, { status: 400 });
    }

    const cantidad = parseCantidad(item.cantidad ?? existingItem.cantidad);
    if (cantidad === null) {
      return NextResponse.json({ error: "items: cantidad invalida." }, { status: 400 });
    }

    const parsedEstadoEntrega =
      item.estadoEntrega === undefined
        ? existingItem.estadoEntrega
        : parseEstadoEquipoPrestamo(item.estadoEntrega);
    if (!parsedEstadoEntrega) {
      return NextResponse.json({ error: "items: estadoEntrega invalido." }, { status: 400 });
    }

    const comentarioEntrega =
      item.comentarioEntrega === undefined
        ? existingItem.comentarioEntrega
        : String(item.comentarioEntrega ?? "").trim() || null;

    if (!existing.prestamoHistorial) {
      parsedItemUpdates.push({
        itemId,
        cantidad,
        estadoEntrega: parsedEstadoEntrega,
        comentarioEntrega,
        estadoDevolucion: null,
        comentarioDevolucion: null,
      });
      continue;
    }

    const parsedEstadoDevolucion =
      item.estadoDevolucion === undefined
        ? existingItem.estadoDevolucion ?? existingItem.estadoEntrega
        : parseEstadoEquipoPrestamo(item.estadoDevolucion);
    if (!parsedEstadoDevolucion) {
      return NextResponse.json({ error: "items: estadoDevolucion invalido." }, { status: 400 });
    }

    const comentarioDevolucion =
      item.comentarioDevolucion === undefined
        ? existingItem.comentarioDevolucion
        : String(item.comentarioDevolucion ?? "").trim() || null;

    parsedItemUpdates.push({
      itemId,
      cantidad,
      estadoEntrega: parsedEstadoEntrega,
      comentarioEntrega,
      estadoDevolucion: parsedEstadoDevolucion,
      comentarioDevolucion,
    });
  }

  if (parsedItemUpdates.length !== existing.items.length) {
    return NextResponse.json(
      { error: "Debes incluir todos los equipos del prestamo para poder editarlo." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.movimiento.update({
        where: { movimientoId: prestamoId },
        data: {
          fecha: fechaPrestamo,
          observaciones: comentarios,
        },
      });

      if (existing.prestamoActivo) {
        await tx.prestamoActivo.update({
          where: { movimientoId: prestamoId },
          data: {
            fechaEstimadaDevolucionTexto,
          },
        });
      }

      if (existing.prestamoHistorial && fechaDevolucion) {
        await tx.prestamoHistorial.update({
          where: { movimientoId: prestamoId },
          data: {
            fechaDevolucion,
            fechaEstimadaDevolucionTexto,
          },
        });
      }

      for (const item of parsedItemUpdates) {
        await tx.movimientoItem.update({
          where: {
            movimientoId_itemId: {
              movimientoId: prestamoId,
              itemId: item.itemId,
            },
          },
          data: {
            cantidad: item.cantidad,
            estadoEntrega: item.estadoEntrega,
            comentarioEntrega: item.comentarioEntrega,
            estadoDevolucion: item.estadoDevolucion,
            comentarioDevolucion: item.comentarioDevolucion,
          },
        });
      }

      return tx.movimiento.findUniqueOrThrow({
        where: { movimientoId: prestamoId },
        include: prestamoInclude,
      });
    });

    const beforeSnapshot = buildPrestamoAuditSnapshot(existing);
    const afterSnapshot = buildPrestamoAuditSnapshot(updated);
    const generalChanges = buildGeneralChanges(beforeSnapshot, afterSnapshot);
    const itemChanges = buildItemChanges(beforeSnapshot, afterSnapshot);

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "PRESTAMO",
      entidadId: updated.movimientoId.toString(),
      detalle: {
        evento: "PRESTAMO_EDITADO_ADMIN",
        motivo,
        resumenCambios: {
          camposGeneralesModificados: Object.keys(generalChanges).length,
          itemsModificados: itemChanges.length,
        },
        cambios: {
          generales: generalChanges,
          items: itemChanges,
        },
        antes: beforeSnapshot,
        despues: afterSnapshot,
      },
    });

    return NextResponse.json(serializePrestamo(updated));
  } catch {
    return NextResponse.json({ error: "No se pudo editar el prestamo." }, { status: 500 });
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
