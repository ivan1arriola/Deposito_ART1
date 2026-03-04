import { NextResponse } from "next/server";
import { TipoStockOperacion } from "@prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  formatDateTimeForDisplay,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import { buildStockByItemMap, registroStockDeltaFactor, stockOperacionDeltaFactor } from "@/lib/stock";
import type { StockDashboardData } from "@/types/views";

type StockItemPayload = {
  itemId: string | number;
  cantidad: number | string;
};

type StockPayload = {
  fecha?: string;
  tipo: TipoStockOperacion | string;
  comentarios?: string;
  items: StockItemPayload[];
};

type StockHistorialInternalEntry = StockDashboardData["historial"][number] & {
  sortFecha: number;
  sortCreatedAt: number;
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

function parseTipoStockOperacion(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "INGRESO") return TipoStockOperacion.INGRESO;
  if (raw === "EGRESO") return TipoStockOperacion.EGRESO;
  return null;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return dateInputToDate(getTodayDateInput());
  return dateInputToDate(raw);
}

function readRequestMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;
  const userAgent = request.headers.get("user-agent") || null;
  return { ip, userAgent };
}

function isValidPayload(body: unknown): body is StockPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (!parseTipoStockOperacion(candidate.tipo)) return false;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return false;
  return true;
}

function hasStockDelegates() {
  const candidate = prisma as typeof prisma & {
    stockOperacion?: unknown;
    stockOperacionItem?: unknown;
  };
  return typeof candidate.stockOperacion !== "undefined" && typeof candidate.stockOperacionItem !== "undefined";
}

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;
  if (!hasStockDelegates()) {
    return NextResponse.json({ error: "El cliente Prisma de stock no esta listo. Reinicia el servidor de desarrollo." }, { status: 503 });
  }

  const limitRaw = Number(new URL(req.url).searchParams.get("limit") ?? "200");
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 20), 400) : 200;

  const [items, stockByItem, stockOperaciones, registros] = await Promise.all([
    prisma.item.findMany({
      orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
      select: { itemId: true, nombre: true, activo: true, ordenPdf: true },
    }),
    buildStockByItemMap(prisma),
    prisma.stockOperacion.findMany({
      include: {
        items: {
          include: {
            item: {
              select: { itemId: true, nombre: true },
            },
          },
          orderBy: { item: { ordenPdf: "asc" } },
        },
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.registro.findMany({
      where: { afectaStock: true },
      include: {
        personal: {
          include: {
            rango: true,
            bateria: true,
          },
        },
        items: {
          include: {
            item: {
              select: { itemId: true, nombre: true },
            },
          },
          orderBy: { item: { ordenPdf: "asc" } },
        },
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
  ]);

  const stockAuditKeys = stockOperaciones.map((operacion) => operacion.stockOperacionId.toString());
  const registroAuditKeys = registros.map((registro) => registro.registroId.toString());
  const auditorias = await prisma.auditoria.findMany({
    where: {
      OR: [
        { entidad: "STOCK", entidadId: { in: stockAuditKeys } },
        { entidad: "REGISTRO", entidadId: { in: registroAuditKeys } },
      ],
    },
    include: {
      usuario: {
        select: {
          grado: true,
          nombre: true,
          apellido: true,
          username: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const auditUserByEntity = new Map<string, string | null>();
  for (const audit of auditorias) {
    if (!audit.entidadId) continue;
    const key = `${audit.entidad}:${audit.entidadId}`;
    if (auditUserByEntity.has(key)) continue;
    const userLabel = audit.usuario
      ? `${audit.usuario.grado} ${audit.usuario.apellido}, ${audit.usuario.nombre}`.replace(/\s+/g, " ").trim()
      : audit.usuarioId
        ? "Usuario eliminado"
        : null;
    auditUserByEntity.set(key, userLabel ?? audit.usuario?.username ?? null);
  }

  const resumen = items.map((item) => ({
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    ordenPdf: item.ordenPdf,
    apareceEnHoja: item.activo,
    stockActual: stockByItem.get(item.itemId.toString()) ?? 0,
  }));

  const historialManual: StockHistorialInternalEntry[] = stockOperaciones.map((operacion) => ({
    id: `manual-${operacion.stockOperacionId.toString()}`,
    fecha: formatDateOnlyFromDate(operacion.fecha) ?? "",
    createdAt: formatDateTimeForDisplay(operacion.createdAt),
    origen: "MANUAL" as const,
    tipo: operacion.tipo,
    afectaStock: true,
    comentarios: operacion.comentarios,
    totalUnidades: operacion.items.reduce((total, item) => total + item.cantidad, 0),
    ci: null,
    persona: null,
    registradoPor: auditUserByEntity.get(`STOCK:${operacion.stockOperacionId.toString()}`) ?? null,
    items: operacion.items.map((item) => ({
      itemId: item.item.itemId.toString(),
      nombre: item.item.nombre,
      cantidad: item.cantidad,
      delta: item.cantidad * stockOperacionDeltaFactor(operacion.tipo),
    })),
    sortFecha: operacion.fecha.getTime(),
    sortCreatedAt: operacion.createdAt.getTime(),
  }));

  const historialPersonal: StockHistorialInternalEntry[] = registros
    .map((registro) => {
      if (registro.tipo !== "ENTREGA" && registro.tipo !== "DEVOLUCION") return null;
      const apellidos = `${registro.personal.apellido1} ${registro.personal.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
      const nombres = `${registro.personal.nombre1} ${registro.personal.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
      return {
        id: `personal-${registro.registroId.toString()}`,
        fecha: formatDateOnlyFromDate(registro.fecha) ?? "",
        createdAt: formatDateTimeForDisplay(registro.createdAt),
        origen: "PERSONAL" as const,
        tipo: registro.tipo,
        afectaStock: registro.afectaStock,
        comentarios: registro.comentarios,
        totalUnidades: registro.items.reduce((total, item) => total + item.cantidad, 0),
        ci: registro.ci,
        persona: `${registro.personal.rango.abreviacion} ${apellidos}, ${nombres}`,
        registradoPor: auditUserByEntity.get(`REGISTRO:${registro.registroId.toString()}`) ?? null,
        items: registro.items.map((item) => ({
          itemId: item.item.itemId.toString(),
          nombre: item.item.nombre,
          cantidad: item.cantidad,
          delta: item.cantidad * registroStockDeltaFactor(registro.tipo),
        })),
        sortFecha: registro.fecha.getTime(),
        sortCreatedAt: registro.createdAt.getTime(),
      };
    })
    .filter((registro): registro is NonNullable<typeof registro> => registro !== null);

  const historial: StockDashboardData["historial"] = [...historialManual, ...historialPersonal]
    .sort((a, b) => {
      const timeDiff = b.sortFecha - a.sortFecha;
      if (timeDiff !== 0) return timeDiff;
      return b.sortCreatedAt - a.sortCreatedAt;
    })
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      fecha: entry.fecha,
      createdAt: entry.createdAt,
      origen: entry.origen,
      tipo: entry.tipo,
      afectaStock: entry.afectaStock,
      comentarios: entry.comentarios,
      totalUnidades: entry.totalUnidades,
      ci: entry.ci,
      persona: entry.persona,
      registradoPor: entry.registradoPor,
      items: entry.items,
    }));

  const data: StockDashboardData = {
    generatedAt: formatDateTimeForDisplay(new Date()),
    resumen,
    historial,
  };

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;
  if (!hasStockDelegates()) {
    return NextResponse.json({ error: "El cliente Prisma de stock no esta listo. Reinicia el servidor de desarrollo." }, { status: 503 });
  }

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. Revisa tipo, fecha e items." }, { status: 400 });
  }

  const tipo = parseTipoStockOperacion(body.tipo);
  const fecha = parseFecha(body.fecha);
  if (!tipo || !fecha) {
    return NextResponse.json({ error: "tipo o fecha invalidos." }, { status: 400 });
  }

  if (body.fecha && isDateInputAfterToday(body.fecha)) {
    return NextResponse.json({ error: "La fecha no puede ser futura." }, { status: 400 });
  }

  const parsedItems = body.items
    .map((item) => ({
      itemId: parseBigIntId(item.itemId),
      cantidad: parseCantidad(item.cantidad),
    }))
    .filter((item) => item.itemId !== null && item.cantidad !== null) as Array<{ itemId: bigint; cantidad: number }>;

  if (parsedItems.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un equipo valido." }, { status: 400 });
  }

  const dedupedItems = new Map<string, number>();
  for (const item of parsedItems) {
    const key = item.itemId.toString();
    dedupedItems.set(key, (dedupedItems.get(key) ?? 0) + item.cantidad);
  }

  const itemIds = Array.from(dedupedItems.keys()).map((itemId) => BigInt(itemId));
  const itemsFound = await prisma.item.findMany({
    where: { itemId: { in: itemIds } },
    select: { itemId: true, nombre: true },
  });

  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen." }, { status: 400 });
  }

  const comentarios = body.comentarios?.trim() || null;
  const itemNombrePorId = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));
  const itemsDetallados = Array.from(dedupedItems.entries()).map(([itemId, cantidad]) => ({
    itemId,
    nombre: itemNombrePorId.get(itemId) ?? "Equipo sin nombre",
    cantidad,
  }));
  const totalUnidades = itemsDetallados.reduce((total, item) => total + item.cantidad, 0);
  const requestMeta = readRequestMeta(req);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const operacion = await tx.stockOperacion.create({
        data: {
          fecha,
          tipo,
          comentarios,
        },
        select: { stockOperacionId: true },
      });

      await tx.stockOperacionItem.createMany({
        data: Array.from(dedupedItems.entries()).map(([itemId, cantidad]) => ({
          stockOperacionId: operacion.stockOperacionId,
          itemId: BigInt(itemId),
          cantidad,
        })),
      });

      return operacion;
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "STOCK",
      entidadId: created.stockOperacionId.toString(),
      detalle: {
        evento: tipo === TipoStockOperacion.INGRESO ? "STOCK_INGRESO" : "STOCK_EGRESO",
        tipo,
        fechaMovimiento: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
        comentarios,
        totalEquipos: itemsDetallados.length,
        totalUnidades,
        items: itemsDetallados,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    return NextResponse.json({ ok: true, stockOperacionId: created.stockOperacionId.toString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la operacion de stock." }, { status: 500 });
  }
}
