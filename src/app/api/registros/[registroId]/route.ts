import { NextResponse } from "next/server";
import { TipoMovimiento } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";

type MovimientoItemPayload = {
  itemId: string | number;
  cantidad: number | string;
};

type UpdateMovimientoPayload = {
  fecha?: string;
  tipo: TipoMovimiento | string;
  comentarios?: string;
  items: MovimientoItemPayload[];
};

function parseMovimientoId(raw: string) {
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

function parseTipoMovimiento(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ENTREGA") return TipoMovimiento.ENTREGA;
  if (raw === "DEVOLUCION") return TipoMovimiento.DEVOLUCION;
  return null;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return dateInputToDate(raw);
}

function isValidPayload(body: unknown): body is UpdateMovimientoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (!parseTipoMovimiento(candidate.tipo)) return false;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return false;
  return true;
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

export async function GET(req: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  const { registroId: movimientoIdParam } = await context.params;
  const movimientoId = parseMovimientoId(movimientoIdParam);
  if (!movimientoId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  const movimiento = await prisma.movimiento.findUnique({
    where: { movimientoId },
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
      personal: {
        select: {
          ci: true,
          apellido1: true,
          apellido2: true,
          nombre1: true,
          nombre2: true,
          rango: {
            select: {
              abreviacion: true,
            },
          },
          subalterno: {
            select: {
              bateria: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      },
      items: {
        include: {
          item: {
            select: {
              itemId: true,
              nombre: true,
              ordenPdf: true,
            },
          },
        },
        orderBy: { item: { ordenPdf: "asc" } },
      },
    },
  });

  if (!movimiento || (movimiento.tipo !== TipoMovimiento.ENTREGA && movimiento.tipo !== TipoMovimiento.DEVOLUCION)) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  const persona = `${movimiento.personal.rango.abreviacion} ${movimiento.personal.apellido1} ${movimiento.personal.apellido2 ?? ""}, ${movimiento.personal.nombre1} ${movimiento.personal.nombre2 ?? ""}`
    .replace(/\s+/g, " ")
    .trim();

  return NextResponse.json({
    registroId: movimiento.movimientoId.toString(),
    fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
    tipo: movimiento.tipo,
    comentarios: movimiento.observaciones,
    ci: movimiento.personalCi,
    persona,
    bateria: movimiento.personal.subalterno?.bateria?.nombre ?? null,
    usuarioEntregaId: movimiento.usuarioEntregaId,
    usuarioEntregaNombre: formatUsuarioMovimientoLabel(movimiento.usuarioEntrega),
    items: movimiento.items.map((detail) => ({
      itemId: detail.item.itemId.toString(),
      nombre: detail.item.nombre,
      cantidad: detail.cantidad,
    })),
  });
}

export async function PUT(req: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { registroId: movimientoIdParam } = await context.params;
  const movimientoId = parseMovimientoId(movimientoIdParam);
  if (!movimientoId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. Revisa tipo, fecha y equipos." }, { status: 400 });
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

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId },
    include: {
      personal: {
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
      },
      items: {
        include: { item: true },
        orderBy: { item: { ordenPdf: "asc" } },
      },
    },
  });

  if (!existing || (existing.tipo !== TipoMovimiento.ENTREGA && existing.tipo !== TipoMovimiento.DEVOLUCION)) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  const itemIds = Array.from(dedupedEquipos.keys()).map((itemId) => BigInt(itemId));
  const itemsFound = await prisma.item.findMany({
    where: { itemId: { in: itemIds } },
    select: { itemId: true, nombre: true },
  });
  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen." }, { status: 400 });
  }

  const comentarios = body.comentarios?.trim() || null;
  const afectaStock = true;
  const itemNombrePorId = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));
  const itemsNuevos = Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
    itemId,
    nombre: itemNombrePorId.get(itemId) ?? "Equipo sin nombre",
    cantidad,
  }));
  const itemsAnteriores = existing.items.map((detail) => ({
    itemId: detail.itemId.toString(),
    nombre: detail.item.nombre,
    cantidad: detail.cantidad,
  }));
  const totalUnidadesAnterior = itemsAnteriores.reduce((acc, item) => acc + item.cantidad, 0);
  const totalUnidadesNuevo = itemsNuevos.reduce((acc, item) => acc + item.cantidad, 0);
  const requestMeta = readRequestMeta(req);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.movimiento.update({
        where: { movimientoId: existing.movimientoId },
        data: {
          tipo,
          fecha,
          afectaStock,
          observaciones: comentarios,
        },
      });

      await tx.movimientoItem.deleteMany({
        where: { movimientoId: existing.movimientoId },
      });

      await tx.movimientoItem.createMany({
        data: Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
          movimientoId: existing.movimientoId,
          itemId: BigInt(itemId),
          cantidad,
        })),
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "REGISTRO",
      entidadId: existing.movimientoId.toString(),
      detalle: {
        evento: "MOVIMIENTO_VESTUARIO_RECTIFICADO",
        ci: existing.personalCi,
        personal: buildPersonalAuditDetail(existing.personal),
        tipoAnterior: existing.tipo,
        tipoNuevo: tipo,
        afectaStockAnterior: existing.afectaStock,
        afectaStockNuevo: afectaStock,
        fechaAnterior: formatDateOnlyFromDate(existing.fecha),
        fechaNueva: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
        comentariosAnterior: existing.observaciones,
        comentariosNuevo: comentarios,
        totalEquiposAnterior: itemsAnteriores.length,
        totalUnidadesAnterior,
        totalEquiposNuevo: itemsNuevos.length,
        totalUnidadesNuevo,
        itemsAnteriores,
        itemsNuevos,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    await Promise.allSettled([
      sendPersonalMovementEmailNotification({
        request: req,
        ci: existing.personalCi,
        subject: "Notificacion de movimiento - Deposito ART1",
        headline: "Se actualizo un movimiento en tu ficha de vestuario.",
        detailLines: [
          `Tipo anterior: ${existing.tipo}`,
          `Tipo nuevo: ${tipo}`,
          `Fecha nueva: ${formatDateOnlyForDisplay(body.fecha || getTodayDateInput())}`,
          `Total unidades nuevo: ${totalUnidadesNuevo}`,
          comentarios ? `Comentarios: ${comentarios}` : "",
        ],
        actorLabel,
        portalPath: "/",
      }),
    ]);

    return NextResponse.json({
      ok: true,
      registroId: existing.movimientoId.toString(),
      ci: existing.personalCi,
      fecha: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo rectificar el movimiento." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar registros." }, { status: 403 });
  }

  const { registroId: movimientoIdParam } = await context.params;
  const movimientoId = parseMovimientoId(movimientoIdParam);
  if (!movimientoId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId },
    include: {
      personal: {
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
      },
      items: {
        include: { item: true },
        orderBy: { item: { ordenPdf: "asc" } },
      },
    },
  });

  if (!existing || (existing.tipo !== TipoMovimiento.ENTREGA && existing.tipo !== TipoMovimiento.DEVOLUCION)) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  const itemsEliminados = existing.items.map((detail) => ({
    itemId: detail.itemId.toString(),
    nombre: detail.item.nombre,
    cantidad: detail.cantidad,
  }));
  const totalUnidadesEliminadas = itemsEliminados.reduce((acc, item) => acc + item.cantidad, 0);
  const requestMeta = readRequestMeta(req);

  try {
    await prisma.movimiento.delete({
      where: { movimientoId: existing.movimientoId },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "REGISTRO",
      entidadId: existing.movimientoId.toString(),
      detalle: {
        evento: "MOVIMIENTO_VESTUARIO_ELIMINADO",
        ci: existing.personalCi,
        personal: buildPersonalAuditDetail(existing.personal),
        tipo: existing.tipo,
        afectaStock: existing.afectaStock,
        fecha: formatDateOnlyFromDate(existing.fecha),
        comentarios: existing.observaciones,
        totalEquiposEliminados: itemsEliminados.length,
        totalUnidadesEliminadas,
        itemsEliminados,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    await Promise.allSettled([
      sendPersonalMovementEmailNotification({
        request: req,
        ci: existing.personalCi,
        subject: "Notificacion de movimiento - Deposito ART1",
        headline: "Se elimino un movimiento de tu ficha de vestuario.",
        detailLines: [
          `Tipo eliminado: ${existing.tipo}`,
          `Fecha del registro: ${formatDateOnlyFromDate(existing.fecha) ?? "-"}`,
          `Total unidades eliminadas: ${totalUnidadesEliminadas}`,
          existing.observaciones ? `Comentarios: ${existing.observaciones}` : "",
        ],
        actorLabel,
        portalPath: "/",
      }),
    ]);

    return NextResponse.json({
      ok: true,
      registroId: existing.movimientoId.toString(),
      ci: existing.personalCi,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el movimiento." }, { status: 500 });
  }
}
