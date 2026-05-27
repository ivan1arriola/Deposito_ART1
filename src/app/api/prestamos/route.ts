import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma, TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { formatPrestamoDestinatario, prestamoInclude, serializePrestamoWithActuante, totalUnidadesPrestamo } from "@/lib/prestamos";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnMovement } from "@/lib/notify-admins";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import {
  ensurePrestamoActuanteCompatibility,
  fetchPrestamoActuanteByMovimientoIds,
  isSargentoRank,
  upsertPrestamoActuante,
} from "@/lib/prestamo-actuante";

type PrestamoClase = "INTERNO" | "EXTERNO" | "PENDIENTE";
type PrestamoDestinatarioTipo = "PERSONAL" | "OFICIAL" | "SUBOFICIAL";

type PrestamoItemPayload = {
  itemId: string | number;
  cantidad: number | string;
  estadoEntrega?: string;
  comentarioEntrega?: string;
};

type PrestamoPayload = {
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
  actuanteCi: string;
  fechaPrestamo?: string;
  fechaEstimadaDevolucionTexto?: string;
  comentarios?: string;
  items: PrestamoItemPayload[];
};

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

function parseFechaPrestamo(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return dateInputToDate(getTodayDateInput());
  return dateInputToDate(raw);
}

function sanitizeExternalPayload(value: PrestamoPayload["destinatarioExterno"] | undefined) {
  return {
    grado: String(value?.grado ?? "").trim(),
    nombre: String(value?.nombre ?? "").trim(),
    apellido: String(value?.apellido ?? "").trim(),
    ci: String(value?.ci ?? "").trim(),
    unidadDestino: String(value?.unidadDestino ?? "").trim(),
  };
}

function inferPrestamoClase(body: Record<string, unknown>) {
  const explicit = parsePrestamoClase(body.clasePrestamo);
  if (explicit) return explicit;

  const external = sanitizeExternalPayload(body.destinatarioExterno as PrestamoPayload["destinatarioExterno"]);
  if (external.ci || external.grado || external.nombre || external.apellido || external.unidadDestino) {
    return "EXTERNO" as const;
  }

  const destinatarioTipo = parseDestinatarioTipo(body.destinatarioTipo);
  const destinatarioCi = String(body.destinatarioCi ?? "").trim();
  if (destinatarioTipo && destinatarioCi) {
    return "INTERNO" as const;
  }

  return "PENDIENTE" as const;
}

function isValidPayload(body: unknown): body is PrestamoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  const clasePrestamo = inferPrestamoClase(candidate);
  const destinatarioTipo = parseDestinatarioTipo(candidate.destinatarioTipo);
  const destinatarioCi = String(candidate.destinatarioCi ?? "").trim();
  const destinatarioExterno = sanitizeExternalPayload(candidate.destinatarioExterno as PrestamoPayload["destinatarioExterno"]);

  if (clasePrestamo === "INTERNO") {
    if (!destinatarioTipo) return false;
    if (!isValidUruguayanCi(destinatarioCi)) return false;
  }

  if (clasePrestamo === "EXTERNO") {
    if (!isValidUruguayanCi(destinatarioExterno.ci)) return false;
    if (!destinatarioExterno.grado || !destinatarioExterno.nombre || !destinatarioExterno.apellido || !destinatarioExterno.unidadDestino) {
      return false;
    }
  }

  if (typeof candidate.actuanteCi !== "string" || String(candidate.actuanteCi).trim() === "") return false;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return false;
  if (candidate.fechaPrestamo !== undefined && typeof candidate.fechaPrestamo !== "string") return false;
  if (candidate.fechaEstimadaDevolucionTexto !== undefined && typeof candidate.fechaEstimadaDevolucionTexto !== "string") return false;
  if (candidate.comentarios !== undefined && typeof candidate.comentarios !== "string") return false;
  return true;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;
  await ensurePrestamoActuanteCompatibility();

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") ?? "todos").trim().toLowerCase();
  const ci = String(url.searchParams.get("ci") ?? "").trim();
  const destinatarioTipo = parseDestinatarioTipo(url.searchParams.get("destinatarioTipo"));
  const clasePrestamo = parsePrestamoClase(url.searchParams.get("clasePrestamo"));
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 400) : 200;

  if (ci && !isValidUruguayanCi(ci)) {
    return NextResponse.json({ error: "CI inválida." }, { status: 400 });
  }

  if (url.searchParams.has("destinatarioTipo") && !destinatarioTipo) {
    return NextResponse.json({ error: "destinatarioTipo inválido." }, { status: 400 });
  }

  if (url.searchParams.has("clasePrestamo") && !clasePrestamo) {
    return NextResponse.json({ error: "clasePrestamo inválida." }, { status: 400 });
  }

  const where: Prisma.MovimientoWhereInput = { tipo: TipoMovimiento.PRESTAMO };
  if (status === "pendiente") {
    where.prestamoActivo = { isNot: null };
  } else if (status === "devuelto") {
    where.prestamoHistorial = { isNot: null };
  }
  if (ci) {
    where.destinatarioPersonal = { is: { ci } };
  }
  if (destinatarioTipo) {
    where.destinatarioPersonal = {
      is: {
        personal: {
          rango: {
            tipo:
              destinatarioTipo === "PERSONAL"
                ? TipoPersonal.SUBALTERNO
                : destinatarioTipo === "OFICIAL"
                  ? TipoPersonal.OFICIAL
                  : TipoPersonal.SUBOFICIAL,
          },
        },
      },
    };
  }
  if (clasePrestamo === "INTERNO") {
    where.destinatarioPersonal = where.destinatarioPersonal ?? { isNot: null };
  } else if (clasePrestamo === "EXTERNO") {
    where.destinatarioExterno = { isNot: null };
  } else if (clasePrestamo === "PENDIENTE") {
    where.destinatarioPersonal = { is: null };
    where.destinatarioExterno = { is: null };
  }

  const prestamos = await prisma.movimiento.findMany({
    where,
    include: prestamoInclude,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const actuanteByMovimientoId = await fetchPrestamoActuanteByMovimientoIds(prestamos.map((prestamo) => prestamo.movimientoId));
  return NextResponse.json(prestamos.map((prestamo) => serializePrestamoWithActuante(prestamo, actuanteByMovimientoId)));
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;
  await ensurePrestamoActuanteCompatibility();

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload inválido. Revisa destinatario, fecha y equipos del préstamo." },
      { status: 400 },
    );
  }

  console.log("DEBUG payload recibido:", body);

  const clasePrestamo = inferPrestamoClase(body as Record<string, unknown>);
  const destinatarioTipo = parseDestinatarioTipo(body.destinatarioTipo);
  const destinatarioCi = String(body.destinatarioCi ?? "").trim().replace(/\D/g, "");
  const destinatarioExterno = sanitizeExternalPayload(body.destinatarioExterno);
  const actuanteCi = String(body.actuanteCi ?? "").trim().replace(/\D/g, "");
  const fechaPrestamoInput = body.fechaPrestamo?.trim() || getTodayDateInput();
  const fechaPrestamo = parseFechaPrestamo(body.fechaPrestamo);
  if (!fechaPrestamo) {
    return NextResponse.json({ error: "fechaPrestamo inválida." }, { status: 400 });
  }
  if (isDateInputAfterToday(fechaPrestamoInput)) {
    return NextResponse.json({ error: "La fecha del préstamo no puede ser futura." }, { status: 400 });
  }

  if (!isValidUruguayanCi(actuanteCi)) {
    return NextResponse.json({ error: "CI inválida en 'por orden de:'." }, { status: 400 });
  }

  const parsedItems = body.items
    .map((item) => ({
      itemId: parseBigIntId(item.itemId),
      cantidad: parseCantidad(item.cantidad),
      estadoEntrega: parseEstadoEquipoPrestamo(item.estadoEntrega) ?? "NUEVO",
      comentarioEntrega: String(item.comentarioEntrega ?? "").trim(),
    }))
    .filter((item) => item.itemId !== null && item.cantidad !== null) as Array<{
    itemId: bigint;
    cantidad: number;
    estadoEntrega: "NUEVO" | "BUENO" | "REGULAR" | "MALO";
    comentarioEntrega: string;
  }>;

  if (parsedItems.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un equipo válido para el préstamo." }, { status: 400 });
  }

  const dedupedItems = new Map<string, { cantidad: number; estadoEntrega: "NUEVO" | "BUENO" | "REGULAR" | "MALO"; comentarioEntrega: string }>();
  for (const item of parsedItems) {
    const key = item.itemId.toString();
    const existing = dedupedItems.get(key);
    if (!existing) {
      dedupedItems.set(key, {
        cantidad: item.cantidad,
        estadoEntrega: item.estadoEntrega,
        comentarioEntrega: item.comentarioEntrega,
      });
      continue;
    }
    if (existing.estadoEntrega !== item.estadoEntrega || existing.comentarioEntrega !== item.comentarioEntrega) {
      return NextResponse.json(
        { error: "No puedes repetir el mismo equipo con distinto estado/comentario en un mismo préstamo." },
        { status: 400 },
      );
    }
    dedupedItems.set(key, { ...existing, cantidad: existing.cantidad + item.cantidad });
  }

  const itemIds = Array.from(dedupedItems.keys()).map((itemId) => BigInt(itemId));
  const [itemsFound, destinatarioPersonal, actorRango, actuanteFound] = await Promise.all([
    prisma.item.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, nombre: true },
    }),
    clasePrestamo === "INTERNO" && destinatarioTipo
      ? prisma.personal.findFirst({
          where: {
            ci: destinatarioCi,
            rango: {
              tipo:
                destinatarioTipo === "PERSONAL"
                  ? TipoPersonal.SUBALTERNO
                  : destinatarioTipo === "OFICIAL"
                    ? TipoPersonal.OFICIAL
                    : TipoPersonal.SUBOFICIAL,
            },
          },
          select: {
            ci: true,
            apellido1: true,
            apellido2: true,
            nombre1: true,
            nombre2: true,
            rango: { select: { tipo: true, abreviacion: true, nombreCompleto: true } },
          },
        })
      : Promise.resolve(null),
    prisma.rango.findUnique({
      where: { rangoId: auth.user.rangoId },
      select: { orden: true },
    }),
    prisma.personal.findFirst({
      where: { ci: actuanteCi },
      select: {
        ci: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: { select: { tipo: true, abreviacion: true, nombreCompleto: true, orden: true } },
      },
    }),
  ]);

  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen." }, { status: 400 });
  }

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

  if (actorRango?.orden == null) {
    return NextResponse.json({ error: "No se pudo determinar el orden del usuario autenticado." }, { status: 400 });
  }

  if (!actuanteFound) {
    return NextResponse.json({ error: "No existe personal para la CI indicada en por orden de." }, { status: 404 });
  }

  const actuanteData = actuanteFound;
  const isEligibleTipo =
    actuanteData.rango.tipo === TipoPersonal.OFICIAL ||
    actuanteData.rango.tipo === TipoPersonal.SUBOFICIAL ||
    (actuanteData.rango.tipo === TipoPersonal.SUBALTERNO &&
      isSargentoRank(actuanteData.rango.abreviacion, actuanteData.rango.nombreCompleto));

  if (!isEligibleTipo) {
    return NextResponse.json(
      { error: "El registro por orden de solo admite oficial, suboficial o sargento." },
      { status: 400 },
    );
  }

  if (actuanteData.rango.orden >= actorRango.orden) {
    return NextResponse.json(
      { error: "El registro por orden de debe ser de rango superior al usuario autenticado." },
      { status: 400 },
    );
  }

  const comentarios = body.comentarios?.trim() || null;
  const fechaEstimadaDevolucionTexto = body.fechaEstimadaDevolucionTexto?.trim() || null;
  const itemNombrePorId = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));

  try {
    const created = await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimiento.create({
        data: {
          tipo: TipoMovimiento.PRESTAMO,
          fecha: fechaPrestamo,
          usuarioEntregaId: auth.user.usuarioId,
          afectaStock: true,
          observaciones: comentarios,
        },
        select: {
          movimientoId: true,
        },
      });

      if (clasePrestamo === "INTERNO" && destinatarioPersonal) {
        await tx.movimientoDestinatarioPersonal.create({
          data: {
            movimientoId: movimiento.movimientoId,
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
            movimientoId: movimiento.movimientoId,
            personaExternaCi: destinatarioExterno.ci,
          },
        });
      }

      const provisionalRecibo = `TMP-${randomUUID()}`;
      await tx.prestamoActivo.create({
        data: {
          movimientoId: movimiento.movimientoId,
          reciboNumero: provisionalRecibo,
          fechaEstimadaDevolucionTexto,
        },
      });

      const reciboNumero = `PR-${movimiento.movimientoId.toString().padStart(8, "0")}`;
      await tx.prestamoActivo.update({
        where: { movimientoId: movimiento.movimientoId },
        data: { reciboNumero },
      });

      await tx.movimientoItem.createMany({
        data: Array.from(dedupedItems.entries()).map(([itemId, entry]) => ({
          movimientoId: movimiento.movimientoId,
          itemId: BigInt(itemId),
          cantidad: entry.cantidad,
          estadoEntrega: entry.estadoEntrega,
          comentarioEntrega: entry.comentarioEntrega || null,
        })),
      });

      console.log("DEBUG actuanteData antes de upsert:", actuanteData);

      await upsertPrestamoActuante(tx, movimiento.movimientoId, actuanteData.ci); 

      return tx.movimiento.findUniqueOrThrow({
        where: { movimientoId: movimiento.movimientoId },
        include: prestamoInclude,
      });
    });

    const destinatarioDetalle = formatPrestamoDestinatario(created);

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "PRESTAMO",
      entidadId: created.movimientoId.toString(),
      detalle: {
        evento: "PRESTAMO_CREADO",
        clasePrestamo: destinatarioDetalle.clase,
        reciboNumero: created.prestamoActivo?.reciboNumero ?? `PR-${created.movimientoId.toString().padStart(8, "0")}`,
        destinatario: {
          tipo: destinatarioDetalle.tipo,
          ci: destinatarioDetalle.ci,
          nombre: destinatarioDetalle.nombre,
          etiqueta: destinatarioDetalle.etiqueta,
          grado: destinatarioDetalle.grado,
          unidadDestino: destinatarioDetalle.unidadDestino,
        },
        fechaPrestamo: formatDateOnlyForDisplay(fechaPrestamoInput),
        fechaEstimadaDevolucionTexto,
        comentarios,
        porOdenDe: {
          ci: actuanteData.ci,
          gradoAbreviacion: actuanteData.rango.abreviacion,
          nombre: `${actuanteData.apellido1} ${actuanteData.apellido2 ?? ""}, ${actuanteData.nombre1} ${actuanteData.nombre2 ?? ""}`
            .replace(/\s+/g, " ")
            .trim(),
        },
        totalEquipos: created.items.length,
        totalUnidades: totalUnidadesPrestamo(created),
        items: created.items.map((item) => ({
          itemId: item.item.itemId.toString(),
          nombre: itemNombrePorId.get(item.item.itemId.toString()) ?? item.item.nombre,
          cantidad: item.cantidad,
          estadoEntrega: item.estadoEntrega,
          comentarioEntrega: item.comentarioEntrega,
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
        `Préstamo ${destinatarioDetalle.clase.toLowerCase()} creado (${totalUnidadesPrestamo(created)} unidades).`,
        `/api/prestamos/${encodeURIComponent(created.movimientoId.toString())}/recibo`,
      );
    } catch {
      // No bloquear préstamo por fallas de push.
    }

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    const resumenItems = created.items
      .slice(0, 4)
      .map((item) => `${item.item.nombre} x${item.cantidad}`)
      .join(", ");
    const resumenItemsLine = created.items.length > 4 ? `${resumenItems}, ...` : resumenItems;
    const destinatarioPersonalCi = created.destinatarioPersonal?.personal.ci ?? null;

    if (destinatarioPersonalCi) {
      await Promise.allSettled([
        sendPersonalMovementEmailNotification({
          request,
          ci: destinatarioPersonalCi,
          subject: "Notificación de préstamo - Sistema de Depósito General - Artillería 1",
          headline: "Se registró un préstamo de vestuario en tu ficha.",
          detailLines: [
            `Recibo: ${created.prestamoActivo?.reciboNumero ?? `PR-${created.movimientoId.toString().padStart(8, "0")}`}`,
            `Fecha: ${formatDateOnlyForDisplay(fechaPrestamoInput)}`,
            `Total de unidades: ${totalUnidadesPrestamo(created)}`,
            `Items: ${resumenItemsLine}`,
            comentarios ? `Comentarios: ${comentarios}` : "",
            fechaEstimadaDevolucionTexto ? `Fecha estimada de devolución: ${fechaEstimadaDevolucionTexto}` : "",
          ],
          actorLabel,
          portalPath: "/",
        }),
      ]);
    }

    const actuanteByMovimientoId = new Map<string, { ci: string; label: string }>();
    actuanteByMovimientoId.set(created.movimientoId.toString(), {
      ci: actuanteData.ci,
      label: `${actuanteData.rango.abreviacion} ${actuanteData.apellido1} ${actuanteData.apellido2 ?? ""}, ${actuanteData.nombre1} ${actuanteData.nombre2 ?? ""}`
        .replace(/\s+/g, " ")
        .trim(),
    });

    return NextResponse.json(serializePrestamoWithActuante(created, actuanteByMovimientoId), { status: 201 });
  } catch (error) {
    console.log("ERROR REGISTRANDO PRESTAMO:", error);
    return NextResponse.json({ error: "No se pudo registrar el préstamo." }, { status: 500 });
  }
}
