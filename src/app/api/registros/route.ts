import { NextResponse } from "next/server";
import { TipoRegistro } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";

type RegistroItemPayload = {
  itemId: string | number;
  cantidad: number | string;
};

type RegistroPayload = {
  ci: string;
  fecha?: string;
  tipo: TipoRegistro | string;
  comentarios?: string;
  items: RegistroItemPayload[];
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

function parseTipoRegistro(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ENTREGA") return TipoRegistro.ENTREGA;
  if (raw === "DEVOLUCION") return TipoRegistro.DEVOLUCION;
  if (raw === "AJUSTE") return TipoRegistro.AJUSTE;
  return null;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
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

function isValidPayload(body: unknown): body is RegistroPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.ci !== "string" || !isValidUruguayanCi(candidate.ci)) return false;
  if (!parseTipoRegistro(candidate.tipo)) return false;
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

  if (summaryOnly) {
    const total = await prisma.registro.count({
      where: ci ? { ci } : undefined,
    });
    return NextResponse.json({ total });
  }

  const registros = await prisma.registro.findMany({
    where: ci ? { ci } : undefined,
    include: {
      items: {
        include: { item: true },
        orderBy: { item: { ordenPdf: "asc" } },
      },
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const registroIds = registros.map((registro) => registro.registroId.toString());
  const auditorias =
    registroIds.length > 0
      ? await prisma.auditoria.findMany({
          where: {
            entidad: "REGISTRO",
            accion: { in: ["CREATE", "UPDATE"] },
            entidadId: { in: registroIds },
          },
          orderBy: { createdAt: "desc" },
          include: {
            usuario: {
              select: { usuarioId: true, username: true, rol: true },
            },
          },
        })
      : [];

  const auditoriaByRegistroId = new Map<string, (typeof auditorias)[number]>();
  for (const auditoria of auditorias) {
    if (!auditoria.entidadId) continue;
    if (!auditoriaByRegistroId.has(auditoria.entidadId)) {
      auditoriaByRegistroId.set(auditoria.entidadId, auditoria);
    }
  }

  return NextResponse.json(
    registros.map((registro) => ({
      registroId: registro.registroId.toString(),
      auditoria: (() => {
        const audit = auditoriaByRegistroId.get(registro.registroId.toString());
        if (!audit) return null;
        return {
          auditoriaId: audit.auditoriaId.toString(),
          createdAt: audit.createdAt.toISOString(),
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
      ci: registro.ci,
      fecha: registro.fecha.toISOString(),
      tipo: registro.tipo,
      comentarios: registro.comentarios,
      createdAt: registro.createdAt.toISOString(),
      items: registro.items.map((detail) => ({
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
    return NextResponse.json({ error: "Payload invalido. Revisa ci, tipo y equipos." }, { status: 400 });
  }

  const ci = body.ci.trim();
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

  const itemIds = Array.from(dedupedEquipos.keys()).map((itemId) => BigInt(itemId));
  const [personalRecord, itemsFound] = await Promise.all([
    prisma.personal.findUnique({
      where: { ci },
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
    }),
    prisma.item.findMany({
      where: { itemId: { in: itemIds }, activo: true },
      select: { itemId: true, nombre: true },
    }),
  ]);

  if (!personalRecord) {
    return NextResponse.json({ error: "No existe personal para la CI indicada." }, { status: 404 });
  }
  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen o estan inactivos." }, { status: 400 });
  }

  const comentarios = body.comentarios?.trim() || null;
  const itemNombrePorId = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));
  const itemsDetallados = Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
    itemId,
    nombre: itemNombrePorId.get(itemId) ?? "Equipo sin nombre",
    cantidad,
  }));
  const totalUnidades = itemsDetallados.reduce((acumulado, item) => acumulado + item.cantidad, 0);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const registro = await tx.registro.create({
        data: {
          ci,
          fecha,
          tipo,
          comentarios,
        },
        select: { registroId: true },
      });

      await tx.registroItem.createMany({
        data: Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
          registroId: registro.registroId,
          itemId: BigInt(itemId),
          cantidad,
        })),
      });

      return registro;
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "REGISTRO",
      entidadId: created.registroId.toString(),
      detalle: {
        evento: "MOVIMIENTO_VESTUARIO",
        ci,
        personal: buildPersonalAuditDetail(personalRecord),
        tipo,
        fechaMovimiento: fecha.toISOString().slice(0, 10),
        comentarios,
        totalEquipos: itemsDetallados.length,
        totalUnidades,
        items: itemsDetallados,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    return NextResponse.json({ ok: true, registroId: created.registroId.toString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo registrar el movimiento." }, { status: 500 });
  }
}
