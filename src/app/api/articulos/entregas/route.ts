import { NextResponse } from "next/server";
import { TipoArticuloStockMovimiento } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { listArticuloEntregasHistorial } from "@/lib/server/articulo-entregas-history-data";
import { isValidUruguayanCi } from "@/lib/ci";
import { calcularStockArticulo } from "@/lib/stock-calc";
import {
  dateInputToDate,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";

type EntregaArticuloItemPayload = {
  articuloId?: unknown;
  cantidad?: unknown;
};

type ArticuloActualizadoEgreso = {
  articuloId: number;
  nombre: string;
  tipo: string;
  stockActual: number;
  cantidadEntregada: number;
};

function parseArticuloId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseCantidad(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseCi(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !isValidUruguayanCi(trimmed)) return null;
  return trimmed;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return dateInputToDate(getTodayDateInput());
  return dateInputToDate(raw);
}

function parseComentario(candidate: Record<string, unknown>) {
  const raw =
    typeof candidate.comentario === "string"
      ? candidate.comentario
      : typeof candidate.comentarios === "string"
        ? candidate.comentarios
        : null;

  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function formatAuthUserLabel(user: {
  grado: string;
  apellido: string;
  nombre: string;
  username: string;
}) {
  const label = `${user.grado} ${user.apellido}, ${user.nombre}`.replace(/\s+/g, " ").trim();
  return label || user.username;
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

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await listArticuloEntregasHistorial());
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener el historial de entregas de artículos." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const personalCi = parseCi(candidate.personalCi);
  const ordenanteCi = parseCi(candidate.ordenanteCi);
  const fecha = parseFecha(candidate.fecha);
  const comentario = parseComentario(candidate);

  if (!personalCi || !ordenanteCi || !fecha) {
    return NextResponse.json(
      {
        error:
          "Payload inválido. 'personalCi' y 'ordenanteCi' deben ser CIs uruguayas válidas y 'fecha' debe ser válida.",
      },
      { status: 400 },
    );
  }

  if (candidate.fecha && isDateInputAfterToday(String(candidate.fecha))) {
    return NextResponse.json({ error: "La fecha no puede ser futura." }, { status: 400 });
  }

  if (!Array.isArray(candidate.equipos) || candidate.equipos.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un artículo válido." }, { status: 400 });
  }

  const normalizedItems = new Map<number, number>();
  for (const rawItem of candidate.equipos as EntregaArticuloItemPayload[]) {
    const articuloId = parseArticuloId(rawItem?.articuloId);
    const cantidad = parseCantidad(rawItem?.cantidad);
    if (articuloId === null || cantidad === null) {
      return NextResponse.json(
        { error: "Cada equipo debe incluir 'articuloId' y 'cantidad' con enteros positivos." },
        { status: 400 },
      );
    }

    normalizedItems.set(articuloId, (normalizedItems.get(articuloId) ?? 0) + cantidad);
  }

  const equipos = Array.from(normalizedItems.entries()).map(([articuloId, cantidad]) => ({
    articuloId,
    cantidad,
  }));

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [destinatario, ordenante, articulos] = await Promise.all([
        tx.personal.findUnique({
          where: { ci: personalCi },
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
        tx.personal.findUnique({
          where: { ci: ordenanteCi },
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
        tx.articulo.findMany({
          where: { articuloId: { in: equipos.map((equipo) => equipo.articuloId) } },
          select: {
            articuloId: true,
            nombre: true,
            tipo: true,
          },
        }),
      ]);

      if (!destinatario) {
        throw new Error("PERSONAL_NOT_FOUND");
      }

      if (!ordenante) {
        throw new Error("ORDENANTE_NOT_FOUND");
      }

      if (articulos.length !== equipos.length) {
        throw new Error("ARTICULO_NOT_FOUND");
      }

      const articuloById = new Map(articulos.map((articulo) => [articulo.articuloId, articulo]));
      for (const equipo of equipos) {
        const articulo = articuloById.get(equipo.articuloId);
        if (!articulo) {
          throw new Error("ARTICULO_NOT_FOUND");
        }
        const stockDisponible = await calcularStockArticulo(equipo.articuloId, tx);
        if (stockDisponible < equipo.cantidad) {
          throw new Error(`INSUFFICIENT_STOCK:${articulo.articuloId}`);
        }
      }

      const entrega = await tx.articuloEntregaPersonal.create({
        data: {
          personalCi,
          usuarioEntregaId: auth.user.usuarioId,
          ordenanteCi,
          fecha,
          comentario,
        },
        select: {
          articuloEntregaPersonalId: true,
          personalCi: true,
          usuarioEntregaId: true,
          ordenanteCi: true,
          fecha: true,
          comentario: true,
        },
      });

      // Create the stock movements (EGRESO)
      await tx.articuloStockMovimiento.createMany({
        data: equipos.map((equipo) => ({
          articuloId: equipo.articuloId,
          tipo: TipoArticuloStockMovimiento.EGRESO,
          cantidad: equipo.cantidad,
          comentario,
          articuloEntregaPersonalId: entrega.articuloEntregaPersonalId,
        })),
      });

      // Compute stock dynamically after creating movements
      const articulosActualizados: ArticuloActualizadoEgreso[] = [];
      for (const equipo of equipos) {
        const articulo = articuloById.get(equipo.articuloId)!;
        const stockActual = await calcularStockArticulo(equipo.articuloId, tx);
        articulosActualizados.push({
          articuloId: articulo.articuloId,
          nombre: articulo.nombre,
          tipo: articulo.tipo,
          stockActual,
          cantidadEntregada: equipo.cantidad,
        });
      }

      return {
        entrega,
        destinatario,
        ordenante,
        articulosActualizados,
      };
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ARTICULO_ENTREGA_PERSONAL",
      entidadId: String(result.entrega.articuloEntregaPersonalId),
      detalle: {
        evento: "STOCK_ARTICULO_EGRESO",
        personal: buildPersonalAuditDetail(result.destinatario),
        ordenante: buildPersonalAuditDetail(result.ordenante),
        usuarioEntrega: formatAuthUserLabel(auth.user),
        fechaMovimiento: formatDateOnlyFromDate(result.entrega.fecha) ?? "",
        comentarios: result.entrega.comentario,
        totalUnidades: result.articulosActualizados.reduce((total, articulo) => total + articulo.cantidadEntregada, 0),
        articulos: result.articulosActualizados.map((articulo) => ({
          nombre: articulo.nombre,
          cantidad: articulo.cantidadEntregada,
        })),
      },
    });

    return NextResponse.json(
      {
        entregaId: String(result.entrega.articuloEntregaPersonalId),
        personalCi: result.entrega.personalCi,
        usuarioEntregaId: result.entrega.usuarioEntregaId,
        ordenanteCi: result.entrega.ordenanteCi,
        fecha: formatDateOnlyFromDate(result.entrega.fecha) ?? "",
        comentario: result.entrega.comentario,
        equipos: result.articulosActualizados.map((articulo) => ({
          articuloId: articulo.articuloId,
          nombre: articulo.nombre,
          tipo: articulo.tipo,
          cantidad: articulo.cantidadEntregada,
          stockActual: articulo.stockActual,
        })),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "PERSONAL_NOT_FOUND") {
        return NextResponse.json({ error: "Personal destinatario no encontrado." }, { status: 404 });
      }

      if (error.message === "ORDENANTE_NOT_FOUND") {
        return NextResponse.json({ error: "Personal ordenante no encontrado." }, { status: 404 });
      }

      if (error.message === "ARTICULO_NOT_FOUND") {
        return NextResponse.json({ error: "Uno o más artículos no existen." }, { status: 404 });
      }

      if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
        const articuloId = Number(error.message.split(":")[1]);
        return NextResponse.json(
          { error: `Stock insuficiente para registrar el egreso del artículo ${articuloId}.` },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      { error: "No se pudo registrar la entrega de artículos a personal." },
      { status: 500 },
    );
  }
}
