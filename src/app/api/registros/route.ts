import { NextResponse } from "next/server";
import { Prisma, TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnMovement } from "@/lib/notify-admins";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import { isValidUruguayanCi } from "@/lib/ci";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  formatDateTimeForDisplay,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";

type MovimientoItemPayload = {
  itemId: string | number;
  cantidad: number | string;
};

type MovimientoPayload = {
  ci?: string;
  ciList?: string[];
  fecha?: string;
  tipo: TipoMovimiento | string;
  comentarios?: string;
  items: MovimientoItemPayload[];
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

function parseTipoMovimiento(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ENTREGA") return TipoMovimiento.ENTREGA;
  if (raw === "DEVOLUCION") return TipoMovimiento.DEVOLUCION;
  return null;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return dateInputToDate(getTodayDateInput());
  return dateInputToDate(raw);
}

function parseTargetCiList(ciValue: unknown, ciListValue: unknown) {
  const candidates: string[] = [];
  if (typeof ciValue === "string" && ciValue.trim() !== "") {
    candidates.push(ciValue.trim());
  }
  if (Array.isArray(ciListValue)) {
    for (const value of ciListValue) {
      if (typeof value === "string" && value.trim() !== "") {
        candidates.push(value.trim());
      }
    }
  }

  const deduped = Array.from(new Set(candidates));
  if (deduped.length === 0) return null;
  if (!deduped.every((ci) => isValidUruguayanCi(ci))) return null;
  return deduped;
}

function readRequestMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;
  const userAgent = request.headers.get("user-agent") || null;
  return { ip, userAgent };
}

function formatUsuarioMovimientoLabel(usuario: {
  rango: { abreviacion: string } | null;
  apellido: string;
  nombre: string;
  username: string;
}) {
  const label = `${usuario.rango?.abreviacion ?? ""} ${usuario.apellido}, ${usuario.nombre}`.replace(/\s+/g, " ").trim();
  return label || usuario.username;
}

function buildPersonalAuditDetail(personal: {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  rango: { nombreCompleto: string; abreviacion: string };
  subalterno: { bateria: { nombre: string } | null } | null;
}) {
  return {
    ci: personal.ci,
    nombre: [personal.nombre1, personal.nombre2, personal.apellido1, personal.apellido2].filter(Boolean).join(" "),
    grado: personal.rango.nombreCompleto,
    gradoAbreviacion: personal.rango.abreviacion,
    bateria: personal.subalterno?.bateria?.nombre ?? null,
  };
}

function isValidPayload(body: unknown): body is MovimientoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (!parseTargetCiList(candidate.ci, candidate.ciList)) return false;
  if (!parseTipoMovimiento(candidate.tipo)) return false;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return false;
  return true;
}

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const ci = (url.searchParams.get("ci") ?? "").trim();
  const summaryOnly = url.searchParams.get("summary") === "1";
  const limitRaw = Number(url.searchParams.get("limit") ?? "120");
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 120;

  if (ci && !isValidUruguayanCi(ci)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  const where: Prisma.MovimientoWhereInput = {
    ...(ci ? { personalCi: ci } : {}),
    tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
  };

  if (summaryOnly) {
    const total = await prisma.movimiento.count({ where });
    return NextResponse.json({ total });
  }

  const movimientos = await prisma.movimiento.findMany({
    where,
    include: {
      usuarioEntrega: {
        select: {
          usuarioId: true,
          username: true,
          nombre: true,
          apellido: true,
          rango: {
            select: {
              abreviacion: true,
            },
          },
        },
      },
      items: {
        include: { item: true },
        orderBy: { item: { ordenPdf: "asc" } },
      },
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const movimientoIds = movimientos.map((movimiento) => movimiento.movimientoId.toString());
  const auditorias =
    movimientoIds.length > 0
      ? await prisma.auditoria.findMany({
          where: {
            entidad: "REGISTRO",
            accion: { in: ["CREATE", "UPDATE"] },
            entidadId: { in: movimientoIds },
          },
          orderBy: { createdAt: "desc" },
          include: {
            usuario: {
              select: { usuarioId: true, username: true, rol: true },
            },
          },
        })
      : [];

  const auditoriaByMovimientoId = new Map<string, (typeof auditorias)[number]>();
  for (const auditoria of auditorias) {
    if (!auditoria.entidadId) continue;
    if (!auditoriaByMovimientoId.has(auditoria.entidadId)) {
      auditoriaByMovimientoId.set(auditoria.entidadId, auditoria);
    }
  }

  return NextResponse.json(
    movimientos.map((movimiento) => ({
      registroId: movimiento.movimientoId.toString(),
      auditoria: (() => {
        const audit = auditoriaByMovimientoId.get(movimiento.movimientoId.toString());
        if (!audit) return null;
        return {
          auditoriaId: audit.auditoriaId.toString(),
          createdAt: formatDateTimeForDisplay(audit.createdAt),
          usuarioId: audit.usuarioId,
          usuario: audit.usuario
            ? {
                usuarioId: audit.usuario.usuarioId,
                username: audit.usuario.username,
                rol: audit.usuario.rol,
              }
            : null,
          detalle: audit.detalle,
          accion: audit.accion,
        };
      })(),
      ci: movimiento.personalCi,
      usuarioEntregaId: movimiento.usuarioEntregaId,
      usuarioEntregaNombre: formatUsuarioMovimientoLabel(movimiento.usuarioEntrega),
      fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
      tipo: movimiento.tipo,
      afectaStock: true,
      comentarios: movimiento.observaciones,
      createdAt: formatDateTimeForDisplay(movimiento.createdAt),
      items: movimiento.items.map((detail) => ({
        itemId: detail.itemId.toString(),
        nombre: detail.item.nombre,
        cantidad: detail.cantidad,
      })),
    })),
  );
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const requestMeta = readRequestMeta(req);
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. Revisa destinatarios, tipo y equipos." }, { status: 400 });
  }

  const targetCis = parseTargetCiList(body.ci, body.ciList);
  if (!targetCis) {
    return NextResponse.json({ error: "Debes enviar al menos una CI valida." }, { status: 400 });
  }

  const tipo = parseTipoMovimiento(body.tipo);
  const fecha = parseFecha(body.fecha);
  if (!tipo || !fecha) {
    return NextResponse.json({ error: "tipo o fecha invalidos." }, { status: 400 });
  }

  if (body.fecha && isDateInputAfterToday(body.fecha)) {
    return NextResponse.json({ error: "La fecha no puede ser futura." }, { status: 400 });
  }

  const parsedEquipos = body.items
    .map((item) => ({
      itemId: parseBigIntId(item.itemId),
      cantidad: parseCantidad(item.cantidad),
    }))
    .filter((item) => item.itemId !== null && item.cantidad !== null) as Array<{ itemId: bigint; cantidad: number }>;

  if (parsedEquipos.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un equipo valido." }, { status: 400 });
  }

  const dedupedEquipos = new Map<string, number>();
  for (const item of parsedEquipos) {
    const key = item.itemId.toString();
    dedupedEquipos.set(key, (dedupedEquipos.get(key) ?? 0) + item.cantidad);
  }

  const itemIds = Array.from(dedupedEquipos.keys()).map((itemId) => BigInt(itemId));
  const [personalRecords, itemsFound] = await Promise.all([
    prisma.personal.findMany({
      where: { ci: { in: targetCis }, tipo: TipoPersonal.SUBALTERNO },
      select: {
        ci: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: {
          select: { nombreCompleto: true, abreviacion: true },
        },
        subalterno: {
          select: {
            bateria: {
              select: { nombre: true },
            },
          },
        },
      },
    }),
    prisma.item.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, nombre: true },
    }),
  ]);

  const personalByCi = new Map(personalRecords.map((personalRecord) => [personalRecord.ci, personalRecord]));
  const missingCis = targetCis.filter((targetCi) => !personalByCi.has(targetCi));
  if (missingCis.length > 0) {
    const preview = missingCis.slice(0, 3).join(", ");
    const suffix = missingCis.length > 3 ? "..." : "";
    return NextResponse.json({ error: `No existe personal para las CIs: ${preview}${suffix}` }, { status: 404 });
  }
  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen." }, { status: 400 });
  }

  const comentarios = body.comentarios?.trim() || null;
  const afectaStock = true;
  const itemNombrePorId = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));
  const itemsDetallados = Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
    itemId,
    nombre: itemNombrePorId.get(itemId) ?? "Equipo sin nombre",
    cantidad,
  }));
  const totalUnidades = itemsDetallados.reduce((acumulado, item) => acumulado + item.cantidad, 0);

  try {
    const createdMovimientos = await prisma.$transaction(async (tx) => {
      const created: Array<{ movimientoId: bigint; personalCi: string }> = [];
      for (const targetCi of targetCis) {
        const movimiento = await tx.movimiento.create({
          data: {
            personalCi: targetCi,
            usuarioEntregaId: auth.user.usuarioId,
            fecha,
            tipo,
            afectaStock,
            observaciones: comentarios,
          },
          select: { movimientoId: true, personalCi: true },
        });

        await tx.movimientoItem.createMany({
          data: Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
            movimientoId: movimiento.movimientoId,
            itemId: BigInt(itemId),
            cantidad,
          })),
        });

        created.push(movimiento);
      }
      return created;
    });

    await Promise.all(
      createdMovimientos.map(async (movimiento) => {
        const personalRecord = personalByCi.get(movimiento.personalCi);
        if (!personalRecord) return;

        await logAudit({
          usuarioId: auth.user.usuarioId,
          accion: "CREATE",
          entidad: "REGISTRO",
          entidadId: movimiento.movimientoId.toString(),
          detalle: {
            evento: "MOVIMIENTO_VESTUARIO",
            ci: movimiento.personalCi,
            personal: buildPersonalAuditDetail(personalRecord),
            tipo,
            afectaStock,
            fechaMovimiento: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
            comentarios,
            totalEquipos: itemsDetallados.length,
            totalUnidades,
            totalDestinatarios: targetCis.length,
            items: itemsDetallados,
            ip: requestMeta.ip,
            userAgent: requestMeta.userAgent,
          },
        });
      }),
    );

    try {
      await notifyAdminOnMovement(
        {
          usuarioId: auth.user.usuarioId,
          username: auth.user.username,
          nombre: auth.user.nombre,
          apellido: auth.user.apellido,
          rol: auth.user.rol,
        },
        `${tipo} para ${targetCis.length} personal(es).`,
        "/",
      );
    } catch {
      // No bloquear registro por fallas de push.
    }

    const tipoLabel = tipo === TipoMovimiento.ENTREGA ? "entrega" : "devolucion";
    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    const resumenItems = itemsDetallados
      .slice(0, 4)
      .map((item) => `${item.nombre} x${item.cantidad}`)
      .join(", ");
    const resumenItemsLine = itemsDetallados.length > 4 ? `${resumenItems}, ...` : resumenItems;

    await Promise.allSettled(
      targetCis.map((targetCi) =>
        sendPersonalMovementEmailNotification({
          request: req,
          ci: targetCi,
          subject: "Notificacion de movimiento - Deposito ART1",
          headline: `Se registro una ${tipoLabel} de vestuario en tu ficha.`,
          detailLines: [
            `Tipo: ${tipo}`,
            `Fecha: ${formatDateOnlyForDisplay(body.fecha || getTodayDateInput())}`,
            `Total de unidades: ${totalUnidades}`,
            `Items: ${resumenItemsLine}`,
            comentarios ? `Comentarios: ${comentarios}` : "",
          ],
          actorLabel,
          portalPath: "/",
        }),
      ),
    );

    if (createdMovimientos.length === 1) {
      return NextResponse.json({ ok: true, registroId: createdMovimientos[0].movimientoId.toString(), createdCount: 1 }, { status: 201 });
    }

    return NextResponse.json(
      {
        ok: true,
        createdCount: createdMovimientos.length,
        registroIds: createdMovimientos.map((movimiento) => movimiento.movimientoId.toString()),
        ciList: targetCis,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "No se pudo registrar el movimiento." }, { status: 500 });
  }
}
