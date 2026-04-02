import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma, TipoMovimiento, TipoPersonal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnMovement } from "@/lib/notify-admins";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { isValidUruguayanCi } from "@/lib/ci";
import { prestamoInclude, serializePrestamo, totalUnidadesPrestamo } from "@/lib/prestamos";

type PrestamoDestinatarioTipo = "PERSONAL" | "OFICIAL" | "SUBOFICIAL";

type PrestamoItemPayload = {
  itemId: string | number;
  cantidad: number | string;
  estadoEntrega?: string;
  comentarioEntrega?: string;
};

type PrestamoPayload = {
  destinatarioTipo: PrestamoDestinatarioTipo | string;
  destinatarioCi: string;
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

function isValidPayload(body: unknown): body is PrestamoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  const destinatarioTipo = parseDestinatarioTipo(candidate.destinatarioTipo);
  const destinatarioCi = String(candidate.destinatarioCi ?? "").trim();
  if (!destinatarioTipo) return false;
  if (!isValidUruguayanCi(destinatarioCi)) return false;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return false;
  if (candidate.fechaPrestamo !== undefined && typeof candidate.fechaPrestamo !== "string") return false;
  if (candidate.fechaEstimadaDevolucionTexto !== undefined && typeof candidate.fechaEstimadaDevolucionTexto !== "string") return false;
  if (candidate.comentarios !== undefined && typeof candidate.comentarios !== "string") return false;
  return true;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") ?? "todos").trim().toLowerCase();
  const ci = String(url.searchParams.get("ci") ?? "").trim();
  const destinatarioTipo = parseDestinatarioTipo(url.searchParams.get("destinatarioTipo"));
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 400) : 200;

  if (ci && !isValidUruguayanCi(ci)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  if (url.searchParams.has("destinatarioTipo") && !destinatarioTipo) {
    return NextResponse.json({ error: "destinatarioTipo invalido." }, { status: 400 });
  }

  const where: Prisma.MovimientoWhereInput = { tipo: TipoMovimiento.PRESTAMO };
  if (status === "pendiente") {
    where.prestamoActivo = { isNot: null };
  } else if (status === "devuelto") {
    where.prestamoHistorial = { isNot: null };
  }
  if (ci) {
    where.personalCi = ci;
  }
  if (destinatarioTipo) {
    where.personal = {
      tipo:
        destinatarioTipo === "PERSONAL"
          ? TipoPersonal.SUBALTERNO
          : destinatarioTipo === "OFICIAL"
            ? TipoPersonal.OFICIAL
            : TipoPersonal.SUBOFICIAL,
    };
  }

  const prestamos = await prisma.movimiento.findMany({
    where,
    include: prestamoInclude,
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json(prestamos.map(serializePrestamo));
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. Revisa destinatario, fecha y equipos del prestamo." },
      { status: 400 },
    );
  }

  const destinatarioTipo = parseDestinatarioTipo(body.destinatarioTipo);
  const destinatarioCi = body.destinatarioCi.trim();
  const fechaPrestamoInput = body.fechaPrestamo?.trim() || getTodayDateInput();
  const fechaPrestamo = parseFechaPrestamo(body.fechaPrestamo);
  if (!destinatarioTipo || !fechaPrestamo) {
    return NextResponse.json({ error: "destinatarioTipo o fechaPrestamo invalidos." }, { status: 400 });
  }
  if (isDateInputAfterToday(fechaPrestamoInput)) {
    return NextResponse.json({ error: "La fecha del prestamo no puede ser futura." }, { status: 400 });
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
    return NextResponse.json({ error: "Debes enviar al menos un equipo valido para el prestamo." }, { status: 400 });
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
        { error: "No puedes repetir el mismo equipo con distinto estado/comentario en un mismo prestamo." },
        { status: 400 },
      );
    }
    dedupedItems.set(key, { ...existing, cantidad: existing.cantidad + item.cantidad });
  }

  const itemIds = Array.from(dedupedItems.keys()).map((itemId) => BigInt(itemId));
  const [itemsFound, destinatarioPersonal] = await Promise.all([
    prisma.item.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, nombre: true },
    }),
    prisma.personal.findFirst({
      where: {
        ci: destinatarioCi,
        tipo:
          destinatarioTipo === "PERSONAL"
            ? TipoPersonal.SUBALTERNO
            : destinatarioTipo === "OFICIAL"
              ? TipoPersonal.OFICIAL
              : TipoPersonal.SUBOFICIAL,
      },
      select: {
        ci: true,
        tipo: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: { select: { abreviacion: true, nombreCompleto: true } },
      },
    }),
  ]);

  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen." }, { status: 400 });
  }

  if (!destinatarioPersonal) {
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

  const comentarios = body.comentarios?.trim() || null;
  const fechaEstimadaDevolucionTexto = body.fechaEstimadaDevolucionTexto?.trim() || null;
  const itemNombrePorId = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));

  try {
    const created = await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimiento.create({
        data: {
          tipo: TipoMovimiento.PRESTAMO,
          fecha: fechaPrestamo,
          personalCi: destinatarioCi,
          usuarioEntregaId: auth.user.usuarioId,
          afectaStock: true,
          observaciones: comentarios,
        },
        select: {
          movimientoId: true,
        },
      });

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

      return tx.movimiento.findUniqueOrThrow({
        where: { movimientoId: movimiento.movimientoId },
        include: prestamoInclude,
      });
    });

    const destinatarioDetalle = {
      tipo: destinatarioTipo,
      ci: destinatarioPersonal.ci,
      nombre: `${destinatarioPersonal.apellido1} ${destinatarioPersonal.apellido2 ?? ""}, ${destinatarioPersonal.nombre1} ${destinatarioPersonal.nombre2 ?? ""}`
        .replace(/\s+/g, " ")
        .trim(),
      grado: destinatarioPersonal.rango.nombreCompleto,
      gradoAbreviacion: destinatarioPersonal.rango.abreviacion,
    };

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "PRESTAMO",
      entidadId: created.movimientoId.toString(),
      detalle: {
        evento: "PRESTAMO_CREADO",
        reciboNumero: created.prestamoActivo?.reciboNumero ?? `PR-${created.movimientoId.toString().padStart(8, "0")}`,
        destinatario: destinatarioDetalle,
        fechaPrestamo: formatDateOnlyForDisplay(fechaPrestamoInput),
        fechaEstimadaDevolucionTexto,
        comentarios,
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
        `Prestamo creado (${totalUnidadesPrestamo(created)} unidades).`,
        `/api/prestamos/${encodeURIComponent(created.movimientoId.toString())}/recibo`,
      );
    } catch {
      // No bloquear prestamo por fallas de push.
    }

    return NextResponse.json(serializePrestamo(created), { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar el prestamo." }, { status: 500 });
  }
}
