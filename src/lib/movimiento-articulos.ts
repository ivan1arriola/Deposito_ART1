import type { PrismaClient, TipoArticulo } from "@/generated/prisma/client";
import { calcularStockArticulo, lockArticulosForUpdate } from "@/lib/stock-calc";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type ArticuloMovimientoInput = {
  articuloId: number;
  cantidad: number;
};

export function parseArticulosPayload(
  rawArticulos: unknown
): { ok: true; items: ArticuloMovimientoInput[] } | { ok: false; error: string } {
  if (rawArticulos === undefined) {
    return { ok: true, items: [] };
  }
  if (!Array.isArray(rawArticulos)) {
    return { ok: false, error: "La lista de artículos es inválida." };
  }

  const deduped = new Map<number, number>();
  for (const item of rawArticulos) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "Cada artículo debe incluir articuloId y cantidad." };
    }
    const record = item as { articuloId?: unknown; cantidad?: unknown };
    const rawId = Number(record.articuloId);
    const rawQty = Number(record.cantidad);
    if (!Number.isInteger(rawId) || rawId <= 0 || !Number.isInteger(rawQty) || rawQty <= 0) {
      return {
        ok: false,
        error: "Cada artículo debe incluir articuloId y cantidad con enteros positivos.",
      };
    }
    deduped.set(rawId, (deduped.get(rawId) ?? 0) + rawQty);
  }

  return {
    ok: true,
    items: Array.from(deduped.entries()).map(([articuloId, cantidad]) => ({
      articuloId,
      cantidad,
    })),
  };
}

export async function applyMovimientoArticulosDelta(
  tx: PrismaTransaction | PrismaClient,
  movimientoId: bigint,
  prevItems: ArticuloMovimientoInput[],
  nextItems: ArticuloMovimientoInput[],
  comentario: string
): Promise<Array<{ articuloId: number; nombre: string; tipo: TipoArticulo; cantidad: number }>> {
  const prevMap = new Map<number, number>();
  for (const item of prevItems) {
    prevMap.set(item.articuloId, (prevMap.get(item.articuloId) ?? 0) + item.cantidad);
  }

  const nextMap = new Map<number, number>();
  for (const item of nextItems) {
    nextMap.set(item.articuloId, (nextMap.get(item.articuloId) ?? 0) + item.cantidad);
  }

  const allIds = Array.from(new Set([...prevMap.keys(), ...nextMap.keys()])).sort((a, b) => a - b);
  if (allIds.length === 0) {
    return [];
  }

  await lockArticulosForUpdate(tx, allIds);

  const client = tx as PrismaClient;
  const articulosDb = await client.articulo.findMany({
    where: { articuloId: { in: allIds } },
    select: { articuloId: true, nombre: true, tipo: true },
  });
  const articuloById = new Map(articulosDb.map((a) => [a.articuloId, a]));

  for (const nextId of nextMap.keys()) {
    if (!articuloById.has(nextId)) {
      throw new Error("ARTICULO_NOT_FOUND");
    }
  }

  const stockMovementsToCreate: Array<{
    articuloId: number;
    tipo: "INGRESO" | "EGRESO";
    cantidad: number;
    comentario: string;
    movimientoId: bigint;
  }> = [];

  for (const articuloId of allIds) {
    const prevQty = prevMap.get(articuloId) ?? 0;
    const nextQty = nextMap.get(articuloId) ?? 0;
    const delta = nextQty - prevQty;
    if (delta === 0) continue;

    if (delta > 0) {
      const stockDisponible = await calcularStockArticulo(articuloId, tx);
      if (stockDisponible < delta) {
        const nombre = articuloById.get(articuloId)?.nombre ?? `#${articuloId}`;
        throw new Error(`INSUFFICIENT_STOCK:${nombre}`);
      }
      stockMovementsToCreate.push({
        articuloId,
        tipo: "EGRESO",
        cantidad: delta,
        comentario,
        movimientoId,
      });
    } else {
      stockMovementsToCreate.push({
        articuloId,
        tipo: "INGRESO",
        cantidad: Math.abs(delta),
        comentario: `${comentario} (compensación)`,
        movimientoId,
      });
    }
  }

  await client.movimientoArticulo.deleteMany({
    where: { movimientoId },
  });

  if (nextMap.size > 0) {
    await client.movimientoArticulo.createMany({
      data: Array.from(nextMap.entries()).map(([articuloId, cantidad]) => ({
        movimientoId,
        articuloId,
        cantidad,
      })),
    });
  }

  if (stockMovementsToCreate.length > 0) {
    await client.articuloStockMovimiento.createMany({
      data: stockMovementsToCreate,
    });
  }

  return Array.from(nextMap.entries()).map(([articuloId, cantidad]) => {
    const info = articuloById.get(articuloId);
    return {
      articuloId,
      nombre: info?.nombre ?? `Artículo #${articuloId}`,
      tipo: info?.tipo ?? "LIMPIEZA",
      cantidad,
    };
  });
}
