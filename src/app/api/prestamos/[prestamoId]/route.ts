import { NextResponse } from "next/server";
import { TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import {
  dateInputToDate,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfter,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { formatPrestamoDestinatario, prestamoInclude, serializePrestamoWithActuante, totalUnidadesPrestamo, type PrestamoWithRelations } from "@/lib/prestamos";
import { ensurePrestamoActuanteCompatibility, fetchPrestamoActuanteByMovimientoIds } from "@/lib/prestamo-actuante";
import { prisma } from "@/lib/prisma";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";

type PrestamoClase = "INTERNO" | "EXTERNO" | "PENDIENTE";
type PrestamoDestinatarioTipo = "PERSONAL" | "OFICIAL" | "SUBOFICIAL";
type EstadoEquipoPrestamo = "NUEVO" | "BUENO" | "REGULAR" | "MALO";

type EditPrestamoPayload = {
  clasePrestamo?: PrestamoClase | string;
  destinatarioTipo?: PrestamoDestinatarioTipo | string;
  destinatarioCi?: string;
  destinatarioExterno?: {
    grado?: string;
    nombre?: string;
    apellido?: string;
    ci?: string;
    unidadDestino?: string;
  };
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

type PrestamoAuditSnapshot = {
  reciboNumero: string;
  estado: "PENDIENTE" | "DEVUELTO";
  destinatario: ReturnType<typeof formatPrestamoDestinatario>;
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

function parsePrestamoClase(value: unknown): PrestamoClase | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "INTERNO") return "INTERNO";
  if (raw === "EXTERNO") return "EXTERNO";
  if (raw === "PENDIENTE") return "PENDIENTE";
  return null;
}

function parseDestinatarioTipo(value: unknown): PrestamoDestinatarioTipo | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "PERSONAL") return "PERSONAL";
  if (raw === "OFICIAL") return "OFICIAL";
  if (raw === "SUBOFICIAL") return "SUBOFICIAL";
  return null;
}

function sanitizeExternalPayload(value: EditPrestamoPayload["destinatarioExterno"] | undefined) {
  return {
    grado: String(value?.grado ?? "").trim(),
    nombre: String(value?.nombre ?? "").trim(),
    apellido: String(value?.apellido ?? "").trim(),
    ci: String(value?.ci ?? "").trim(),
    unidadDestino: String(value?.unidadDestino ?? "").trim(),
  };
}

function hasDestinatarioPatch(body: EditPrestamoPayload) {
  return (
    body.clasePrestamo !== undefined ||
    body.destinatarioTipo !== undefined ||
    body.destinatarioCi !== undefined ||
    body.destinatarioExterno !== undefined
  );
}

function inferPrestamoClaseForEdit(body: EditPrestamoPayload): PrestamoClase {
  const explicit = parsePrestamoClase(body.clasePrestamo);
  if (explicit) return explicit;

  const external = sanitizeExternalPayload(body.destinatarioExterno);
  if (external.ci || external.grado || external.nombre || external.apellido || external.unidadDestino) {
    return "EXTERNO";
  }

  const destinatarioTipo = parseDestinatarioTipo(body.destinatarioTipo);
  const destinatarioCi = String(body.destinatarioCi ?? "").trim();
  if (destinatarioTipo && destinatarioCi) {
    return "INTERNO";
  }

  return "PENDIENTE";
}

function tipoPersonalFromDestinatario(tipo: PrestamoDestinatarioTipo): TipoPersonal {
  if (tipo === "PERSONAL") return TipoPersonal.SUBALTERNO;
  if (tipo === "OFICIAL") return TipoPersonal.OFICIAL;
  return TipoPersonal.SUBOFICIAL;
}

function buildPrestamoAuditSnapshot(prestamo: PrestamoWithRelations): PrestamoAuditSnapshot {
  return {
    reciboNumero:
      prestamo.prestamoHistorial?.reciboNumero ??
      prestamo.prestamoActivo?.reciboNumero ??
      `PR-${prestamo.movimientoId.toString().padStart(8, "0")}`,
    estado: prestamo.prestamoHistorial ? "DEVUELTO" : "PENDIENTE",
    destinatario: formatPrestamoDestinatario(prestamo),
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
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {};

  if (JSON.stringify(before.destinatario) !== JSON.stringify(after.destinatario)) {
    cambios.destinatario = { antes: before.destinatario, despues: after.destinatario };
  }
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

      const changes: Record<string, { antes: unknown; despues: unknown }> = {};
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
    .filter(
      (
        entry,
      ): entry is {
        itemId: string;
        nombre: string;
        changes: Record<string, { antes: unknown; despues: unknown }>;
      } => entry !== null,
    );
}

export const prestamoByIdRouteTestables = {
  parsePrestamoId,
  parseBigIntId,
  parseCantidad,
  parseEstadoEquipoPrestamo,
  parsePrestamoClase,
  parseDestinatarioTipo,
  buildGeneralChanges,
  buildItemChanges,
};

export async function GET(request: Request, context: { params: Promise<{ prestamoId: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;
  await ensurePrestamoActuanteCompatibility();

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId inválido." }, { status: 400 });
  }

  const prestamo = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoInclude,
  });

  if (!prestamo || prestamo.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  }

  const actuanteByMovimientoId = await fetchPrestamoActuanteByMovimientoIds([prestamo.movimientoId]);
  return NextResponse.json(serializePrestamoWithActuante(prestamo, actuanteByMovimientoId));
}

export async function PUT(request: Request, context: { params: Promise<{ prestamoId: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;
  await ensurePrestamoActuanteCompatibility();

  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede editar préstamos." }, { status: 403 });
  }

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId inválido." }, { status: 400 });
  }

  const body = (await request.json()) as EditPrestamoPayload;
  const motivo = String(body.motivo ?? "").trim();
  if (!motivo) {
    return NextResponse.json({ error: "Debes indicar el motivo de la edición." }, { status: 400 });
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoInclude,
  });

  if (!existing || existing.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  }

  const fechaPrestamoActualInput = formatDateOnlyFromDate(existing.fecha) ?? getTodayDateInput();
  const fechaPrestamoInput =
    typeof body.fechaPrestamo === "string" && body.fechaPrestamo.trim() !== ""
      ? body.fechaPrestamo.trim()
      : fechaPrestamoActualInput;
  const fechaPrestamo = dateInputToDate(fechaPrestamoInput);
  if (!fechaPrestamo) {
    return NextResponse.json({ error: "fechaPrestamo inválida." }, { status: 400 });
  }
  if (isDateInputAfterToday(fechaPrestamoInput)) {
    return NextResponse.json({ error: "La fecha del préstamo no puede ser futura." }, { status: 400 });
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
        return NextResponse.json({ error: "fechaDevolucion inválida." }, { status: 400 });
      }
      const parsedFechaDevolucion = dateInputToDate(rawFechaDevolucion);
      if (!parsedFechaDevolucion) {
        return NextResponse.json({ error: "fechaDevolucion inválida." }, { status: 400 });
      }
      if (isDateInputAfterToday(rawFechaDevolucion)) {
        return NextResponse.json({ error: "La fecha de devolución no puede ser futura." }, { status: 400 });
      }
      fechaDevolucionInput = rawFechaDevolucion;
      fechaDevolucion = parsedFechaDevolucion;
    }
    if (fechaDevolucionInput && isDateInputAfter(fechaPrestamoInput, fechaDevolucionInput)) {
      return NextResponse.json(
        { error: "La fecha de devolución no puede ser anterior a la fecha del préstamo." },
        { status: 400 },
      );
    }
  } else if (body.fechaDevolucion !== undefined) {
    return NextResponse.json(
      { error: "Solo se puede editar la fecha de devolución en préstamos ya devueltos." },
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

  let clasePrestamo = formatPrestamoDestinatario(existing).clase;
  let destinatarioTipo = existing.destinatarioPersonal?.personal.rango.tipo
    ? existing.destinatarioPersonal.personal.rango.tipo === TipoPersonal.SUBALTERNO
      ? ("PERSONAL" as const)
      : existing.destinatarioPersonal.personal.rango.tipo === TipoPersonal.OFICIAL
        ? ("OFICIAL" as const)
        : ("SUBOFICIAL" as const)
    : null;
  let destinatarioCi = existing.destinatarioPersonal?.personal.ci ?? "";
  let destinatarioExterno = existing.destinatarioExterno?.personaExterna
    ? {
        grado: existing.destinatarioExterno.personaExterna.grado,
        nombre: existing.destinatarioExterno.personaExterna.nombre,
        apellido: existing.destinatarioExterno.personaExterna.apellido,
        ci: existing.destinatarioExterno.personaExterna.ci,
        unidadDestino: existing.destinatarioExterno.personaExterna.unidadDestino,
      }
    : sanitizeExternalPayload(undefined);

  if (hasDestinatarioPatch(body)) {
    clasePrestamo = inferPrestamoClaseForEdit(body);
    destinatarioTipo = parseDestinatarioTipo(body.destinatarioTipo);
    destinatarioCi = String(body.destinatarioCi ?? "").trim();
    destinatarioExterno = sanitizeExternalPayload(body.destinatarioExterno);

    if (clasePrestamo === "INTERNO") {
      if (!destinatarioTipo || !isValidUruguayanCi(destinatarioCi)) {
        return NextResponse.json(
          { error: "Debes indicar un destinatario interno válido para completar el préstamo." },
          { status: 400 },
        );
      }
    }

    if (clasePrestamo === "EXTERNO") {
      if (
        !isValidUruguayanCi(destinatarioExterno.ci) ||
        !destinatarioExterno.grado ||
        !destinatarioExterno.nombre ||
        !destinatarioExterno.apellido ||
        !destinatarioExterno.unidadDestino
      ) {
        return NextResponse.json(
          { error: "Debes completar grado, nombre, apellido, CI y unidad de destino del destinatario externo." },
          { status: 400 },
        );
      }
    }
  }

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
    return NextResponse.json({ error: "Debes incluir al menos un equipo para editar el préstamo." }, { status: 400 });
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
      return NextResponse.json({ error: "items: itemId inválido." }, { status: 400 });
    }

    const itemIdKey = itemId.toString();
    if (seenItemIds.has(itemIdKey)) {
      return NextResponse.json({ error: "No puedes repetir equipos en la edición del préstamo." }, { status: 400 });
    }
    seenItemIds.add(itemIdKey);

    const existingItem = existingItemsById.get(itemIdKey);
    if (!existingItem) {
      return NextResponse.json({ error: "Solo puedes editar equipos ya incluidos en el préstamo." }, { status: 400 });
    }

    const cantidad = parseCantidad(item.cantidad ?? existingItem.cantidad);
    if (cantidad === null) {
      return NextResponse.json({ error: "items: cantidad inválida." }, { status: 400 });
    }

    const parsedEstadoEntrega =
      item.estadoEntrega === undefined
        ? existingItem.estadoEntrega
        : parseEstadoEquipoPrestamo(item.estadoEntrega);
    if (!parsedEstadoEntrega) {
      return NextResponse.json({ error: "items: estadoEntrega inválido." }, { status: 400 });
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
      return NextResponse.json({ error: "items: estadoDevolucion inválido." }, { status: 400 });
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
      { error: "Debes incluir todos los equipos del préstamo para poder editarlo." },
      { status: 400 },
    );
  }

  const destinatarioPersonal =
    clasePrestamo === "INTERNO" && destinatarioTipo
      ? await prisma.personal.findFirst({
          where: {
            ci: destinatarioCi,
            rango: {
              tipo: tipoPersonalFromDestinatario(destinatarioTipo),
            },
          },
          select: {
            ci: true,
          },
        })
      : null;

  if (clasePrestamo === "INTERNO" && !destinatarioPersonal) {
    return NextResponse.json(
      {
        error:
          destinatarioTipo === "PERSONAL"
            ? "No existe personal subalterno para la CI indicada."
            : "No existe oficial/suboficial para la CI indicada.",
      },
      { status: 404 },
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

      if (hasDestinatarioPatch(body)) {
        await tx.movimientoDestinatarioPersonal.deleteMany({
          where: { movimientoId: prestamoId },
        });
        await tx.movimientoDestinatarioExterno.deleteMany({
          where: { movimientoId: prestamoId },
        });

        if (clasePrestamo === "INTERNO" && destinatarioPersonal) {
          await tx.movimientoDestinatarioPersonal.create({
            data: {
              movimientoId: prestamoId,
              ci: destinatarioPersonal.ci,
            },
          });
        }

        if (clasePrestamo === "EXTERNO") {
          await tx.personaExterna.upsert({
            where: { ci: destinatarioExterno.ci },
            create: {
              ci: destinatarioExterno.ci,
              grado: destinatarioExterno.grado,
              nombre: destinatarioExterno.nombre,
              apellido: destinatarioExterno.apellido,
              unidadDestino: destinatarioExterno.unidadDestino,
            },
            update: {
              grado: destinatarioExterno.grado,
              nombre: destinatarioExterno.nombre,
              apellido: destinatarioExterno.apellido,
              unidadDestino: destinatarioExterno.unidadDestino,
            },
          });

          await tx.movimientoDestinatarioExterno.create({
            data: {
              movimientoId: prestamoId,
              personaExternaCi: destinatarioExterno.ci,
            },
          });
        }
      }

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

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    const destinatarioPersonalCi = updated.destinatarioPersonal?.personal.ci ?? null;
    if (destinatarioPersonalCi) {
      await Promise.allSettled([
        sendPersonalMovementEmailNotification({
          request,
          ci: destinatarioPersonalCi,
          subject: "Notificación de préstamo - Depósito ART1",
          headline: "Se actualizó un préstamo asociado a tu ficha.",
          detailLines: [
            `Recibo: ${afterSnapshot.reciboNumero}`,
            `Estado: ${afterSnapshot.estado}`,
            `Fecha préstamo: ${afterSnapshot.fechaPrestamo ?? "-"}`,
            afterSnapshot.fechaDevolucion ? `Fecha devolución: ${afterSnapshot.fechaDevolucion}` : "",
            `Motivo: ${motivo}`,
          ],
          actorLabel,
          portalPath: "/",
        }),
      ]);
    }

    const actuanteByMovimientoId = await fetchPrestamoActuanteByMovimientoIds([updated.movimientoId]);
    return NextResponse.json(serializePrestamoWithActuante(updated, actuanteByMovimientoId));
  } catch {
    return NextResponse.json({ error: "No se pudo editar el préstamo." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ prestamoId: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar préstamos." }, { status: 403 });
  }

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId inválido." }, { status: 400 });
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoInclude,
  });

  if (!existing || existing.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  }

  const destinatario = formatPrestamoDestinatario(existing);

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
        destinatario: {
          clase: destinatario.clase,
          tipo: destinatario.tipo,
          ci: destinatario.ci,
          nombre: destinatario.nombre,
          etiqueta: destinatario.etiqueta,
          grado: destinatario.grado,
          unidadDestino: destinatario.unidadDestino,
        },
        fechaPrestamo: formatDateOnlyFromDate(existing.fecha),
        fechaDevolucion: existing.prestamoHistorial ? formatDateOnlyFromDate(existing.prestamoHistorial.fechaDevolucion) : null,
        totalEquipos: existing.items.length,
        totalUnidades: totalUnidadesPrestamo(existing),
      },
    });

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    const destinatarioPersonalCi = existing.destinatarioPersonal?.personal.ci ?? null;
    if (destinatarioPersonalCi) {
      await Promise.allSettled([
        sendPersonalMovementEmailNotification({
          request,
          ci: destinatarioPersonalCi,
          subject: "Notificación de préstamo - Depósito ART1",
          headline: "Se eliminó un préstamo asociado a tu ficha.",
          detailLines: [
            `Recibo: ${existing.prestamoHistorial?.reciboNumero ?? existing.prestamoActivo?.reciboNumero ?? `PR-${existing.movimientoId.toString().padStart(8, "0")}`}`,
            `Estado previo: ${existing.prestamoHistorial ? "DEVUELTO" : "PENDIENTE"}`,
            `Fecha préstamo: ${formatDateOnlyFromDate(existing.fecha) ?? "-"}`,
          ],
          actorLabel,
          portalPath: "/",
        }),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el préstamo." }, { status: 500 });
  }
}
