import { NextResponse } from "next/server";
import { TipoArticuloStockMovimiento } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calcularStockArticulo } from "@/lib/stock-calc";

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

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const articuloId = parseArticuloId(candidate?.articuloId);
  const cantidad = parseCantidad(candidate?.cantidad);
  const comentarioRaw =
    typeof candidate?.comentario === "string"
      ? candidate.comentario
      : typeof candidate?.comentarios === "string"
        ? candidate.comentarios
        : null;
  const comentario =
    typeof comentarioRaw === "string" && comentarioRaw.trim() !== ""
      ? comentarioRaw.trim()
      : null;

  if (articuloId === null || cantidad === null) {
    return NextResponse.json(
      { error: "Payload inválido. 'articuloId' y 'cantidad' deben ser enteros positivos." },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const actual = await tx.articulo.findUnique({
        where: { articuloId },
        select: {
          articuloId: true,
          nombre: true,
          tipo: true,
        },
      });

      if (!actual) {
        throw new Error("ARTICULO_NOT_FOUND");
      }

      const movimiento = await tx.articuloStockMovimiento.create({
        data: {
          articuloId,
          tipo: TipoArticuloStockMovimiento.INGRESO,
          cantidad,
          comentario,
        },
        select: {
          articuloStockMovimientoId: true,
        },
      });

      // Compute stock dynamically after the movement is recorded
      const stockActual = await calcularStockArticulo(articuloId, tx);

      return {
        articulo: { ...actual, stockActual },
        movimiento,
      };
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ARTICULO_STOCK",
      entidadId: String(result.movimiento.articuloStockMovimientoId),
      detalle: {
        articuloId,
        articulo: result.articulo.nombre,
        tipo: result.articulo.tipo,
        tipoMovimiento: TipoArticuloStockMovimiento.INGRESO,
        cantidadIngresada: cantidad,
        stockActual: result.articulo.stockActual,
        comentario,
      },
    });

    return NextResponse.json(result.articulo, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ARTICULO_NOT_FOUND") {
      return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo registrar el ingreso de stock del artículo." }, { status: 500 });
  }
}
