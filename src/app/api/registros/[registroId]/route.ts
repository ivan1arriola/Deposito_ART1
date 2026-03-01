import { NextResponse } from "next/server";
import { TipoRegistro } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type RegistroItemPayload = {
  itemId: string | number;
  cantidad: number | string;
};

type UpdateRegistroPayload = {
  fecha?: string;
  tipo: TipoRegistro | string;
  comentarios?: string;
  items: RegistroItemPayload[];
};

function parseRegistroId(raw: string) {
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

function parseTipoRegistro(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ENTREGA") return TipoRegistro.ENTREGA;
  if (raw === "DEVOLUCION") return TipoRegistro.DEVOLUCION;
  return null;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isValidPayload(body: unknown): body is UpdateRegistroPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (!parseTipoRegistro(candidate.tipo)) return false;
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

function buildPersonalAuditDetail(personal: {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  rango: { nombreCompleto: string; abreviacion: string };
  bateria: { nombre: string } | null;
}) {
  return {
    ci: personal.ci,
    nombre: [personal.nombre1, personal.nombre2, personal.apellido1, personal.apellido2].filter(Boolean).join(" "),
    grado: personal.rango.nombreCompleto,
    gradoAbreviacion: personal.rango.abreviacion,
    bateria: personal.bateria?.nombre ?? null,
  };
}

export async function PUT(req: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { registroId: registroIdParam } = await context.params;
  const registroId = parseRegistroId(registroIdParam);
  if (!registroId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. Revisa tipo, fecha y equipos." }, { status: 400 });
  }

  const tipo = parseTipoRegistro(body.tipo);
  const fecha = parseFecha(body.fecha);
  if (!tipo || !fecha) {
    return NextResponse.json({ error: "tipo o fecha invalidos." }, { status: 400 });
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (fecha.getTime() > today.getTime()) {
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

  const existing = await prisma.registro.findUnique({
    where: { registroId },
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
          bateria: {
            select: { nombre: true },
          },
        },
      },
      items: {
        include: { item: true },
        orderBy: { item: { ordenPdf: "asc" } },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  if (existing.tipo === TipoRegistro.AJUSTE) {
    return NextResponse.json({ error: "Los ajustes no se rectifican desde esta vista." }, { status: 409 });
  }

  const itemIds = Array.from(dedupedEquipos.keys()).map((itemId) => BigInt(itemId));
  const itemsFound = await prisma.item.findMany({
    where: { itemId: { in: itemIds }, activo: true },
    select: { itemId: true, nombre: true },
  });
  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen o estan inactivos." }, { status: 400 });
  }

  const comentarios = body.comentarios?.trim() || null;
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
      await tx.registro.update({
        where: { registroId: existing.registroId },
        data: {
          tipo,
          fecha,
          comentarios,
        },
      });

      await tx.registroItem.deleteMany({
        where: { registroId: existing.registroId },
      });

      await tx.registroItem.createMany({
        data: Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
          registroId: existing.registroId,
          itemId: BigInt(itemId),
          cantidad,
        })),
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "REGISTRO",
      entidadId: existing.registroId.toString(),
      detalle: {
        evento: "MOVIMIENTO_VESTUARIO_RECTIFICADO",
        ci: existing.ci,
        personal: buildPersonalAuditDetail(existing.personal),
        tipoAnterior: existing.tipo,
        tipoNuevo: tipo,
        fechaAnterior: existing.fecha.toISOString().slice(0, 10),
        fechaNueva: fecha.toISOString().slice(0, 10),
        comentariosAnterior: existing.comentarios,
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

    return NextResponse.json({ ok: true, registroId: existing.registroId.toString(), ci: existing.ci });
  } catch {
    return NextResponse.json({ error: "No se pudo rectificar el movimiento." }, { status: 500 });
  }
}
