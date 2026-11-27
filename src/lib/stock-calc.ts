import type { PrismaClient } from "@/generated/prisma/client";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Calcula el stock actual de un artículo sumando INGRESOS y restando EGRESOS
 * desde la tabla de movimientos. Esta es la fuente de verdad única.
 */
export async function calcularStockArticulo(
  articuloId: number,
  tx: PrismaTransaction | PrismaClient
): Promise<number> {
  const [ingresos, egresos] = await Promise.all([
    (tx as PrismaClient).articuloStockMovimiento.aggregate({
      where: { articuloId, tipo: "INGRESO" },
      _sum: { cantidad: true },
    }),
    (tx as PrismaClient).articuloStockMovimiento.aggregate({
      where: { articuloId, tipo: "EGRESO" },
      _sum: { cantidad: true },
    }),
  ]);

  return (ingresos._sum.cantidad ?? 0) - (egresos._sum.cantidad ?? 0);
}

/**
 * Calcula el stock de todos los artículos en una sola consulta agrupada.
 * Retorna un Map<articuloId, stockActual>.
 */
export async function calcularStockTodos(
  tx: PrismaTransaction | PrismaClient
): Promise<Map<number, number>> {
  const movimientos = await (tx as PrismaClient).articuloStockMovimiento.groupBy({
    by: ["articuloId", "tipo"],
    _sum: { cantidad: true },
  });

  const stockMap = new Map<number, number>();

  for (const mov of movimientos) {
    const current = stockMap.get(mov.articuloId) ?? 0;
    const delta = mov.tipo === "INGRESO" ? (mov._sum.cantidad ?? 0) : -(mov._sum.cantidad ?? 0);
    stockMap.set(mov.articuloId, current + delta);
  }

  return stockMap;
}
