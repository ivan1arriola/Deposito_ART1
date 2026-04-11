import { Prisma, TipoMovimiento, TipoStockOperacion } from "@/generated/prisma/client";

type PrismaLike = Pick<Prisma.TransactionClient, "movimiento" | "stockOperacion" | "prestamoActivo">;
type PrismaRawLike = Pick<Prisma.TransactionClient, "$queryRaw">;

type StockMapOptions = {
  excludeMovimientoId?: bigint | null;
};

export function movimientoStockDeltaFactor(tipo: TipoMovimiento | "ENTREGA" | "DEVOLUCION" | "PRESTAMO") {
  switch (tipo) {
    case TipoMovimiento.ENTREGA:
    case "ENTREGA":
    case TipoMovimiento.PRESTAMO:
    case "PRESTAMO":
      return -1;
    case TipoMovimiento.DEVOLUCION:
    case "DEVOLUCION":
      return 1;
    default:
      return 0;
  }
}

export function movimientoPersonalDeltaFactor(tipo: TipoMovimiento | "ENTREGA" | "DEVOLUCION" | "PRESTAMO") {
  switch (tipo) {
    case TipoMovimiento.ENTREGA:
    case "ENTREGA":
      return 1;
    case TipoMovimiento.DEVOLUCION:
    case "DEVOLUCION":
      return -1;
    default:
      return 0;
  }
}

export function stockOperacionDeltaFactor(tipo: TipoStockOperacion | "INGRESO" | "EGRESO") {
  switch (tipo) {
    case TipoStockOperacion.INGRESO:
    case "INGRESO":
      return 1;
    default:
      return -1;
  }
}

type AggregateRow = {
  itemId: bigint | number | string;
  total: bigint | number | string | null;
};

function toSafeInteger(value: AggregateRow["total"]) {
  if (value === null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowsToItemMap(rows: AggregateRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(String(row.itemId), toSafeInteger(row.total));
  }
  return map;
}

export async function buildStockSummaryMaps(prisma: PrismaRawLike) {
  const [unidadRows, personalRows, prestamoRows] = await Promise.all([
    prisma.$queryRaw<AggregateRow[]>`
      SELECT
        soi.item_id AS "itemId",
        SUM(CASE WHEN so.tipo = 'INGRESO' THEN soi.cantidad ELSE -soi.cantidad END)::bigint AS total
      FROM stock_operacion_item soi
      INNER JOIN stock_operacion so
        ON so.stock_operacion_id = soi.stock_operacion_id
      GROUP BY soi.item_id
    `,
    prisma.$queryRaw<AggregateRow[]>`
      SELECT
        mi.item_id AS "itemId",
        SUM(
          CASE
            WHEN m.tipo = 'ENTREGA' THEN mi.cantidad
            WHEN m.tipo = 'DEVOLUCION' THEN -mi.cantidad
            ELSE 0
          END
        )::bigint AS total
      FROM movimiento_item mi
      INNER JOIN movimiento m
        ON m.movimiento_id = mi.movimiento_id
      WHERE m.tipo IN ('ENTREGA', 'DEVOLUCION')
      GROUP BY mi.item_id
    `,
    prisma.$queryRaw<AggregateRow[]>`
      SELECT
        mi.item_id AS "itemId",
        SUM(mi.cantidad)::bigint AS total
      FROM prestamo_activo pa
      INNER JOIN movimiento_item mi
        ON mi.movimiento_id = pa.movimiento_id
      GROUP BY mi.item_id
    `,
  ]);

  return {
    unidadByItem: rowsToItemMap(unidadRows),
    personalByItem: rowsToItemMap(personalRows),
    prestamoByItem: rowsToItemMap(prestamoRows),
  };
}

export async function buildStockByItemMap(prisma: PrismaLike, options: StockMapOptions = {}) {
  const [movimientos, operaciones, prestamosActivos] = await Promise.all([
    prisma.movimiento.findMany({
      where: {
        tipo: {
          in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION],
        },
        ...(options.excludeMovimientoId ? { movimientoId: { not: options.excludeMovimientoId } } : {}),
      },
      select: {
        tipo: true,
        items: {
          select: {
            itemId: true,
            cantidad: true,
          },
        },
      },
    }),
    prisma.stockOperacion.findMany({
      select: {
        tipo: true,
        items: {
          select: {
            itemId: true,
            cantidad: true,
          },
        },
      },
    }),
    prisma.prestamoActivo.findMany({
      select: {
        movimiento: {
          select: {
            items: {
              select: {
                itemId: true,
                cantidad: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const stockByItem = new Map<string, number>();

  for (const movimiento of movimientos) {
    const factor = movimientoStockDeltaFactor(movimiento.tipo);
    if (factor === 0) continue;
    for (const item of movimiento.items) {
      const key = item.itemId.toString();
      stockByItem.set(key, (stockByItem.get(key) ?? 0) + item.cantidad * factor);
    }
  }

  for (const operacion of operaciones) {
    const factor = stockOperacionDeltaFactor(operacion.tipo);
    for (const item of operacion.items) {
      const key = item.itemId.toString();
      stockByItem.set(key, (stockByItem.get(key) ?? 0) + item.cantidad * factor);
    }
  }

  for (const prestamo of prestamosActivos) {
    for (const item of prestamo.movimiento.items) {
      const key = item.itemId.toString();
      stockByItem.set(key, (stockByItem.get(key) ?? 0) - item.cantidad);
    }
  }

  return stockByItem;
}

export async function buildUnidadByItemMap(prisma: Pick<Prisma.TransactionClient, "stockOperacion">) {
  const operaciones = await prisma.stockOperacion.findMany({
    select: {
      tipo: true,
      items: {
        select: {
          itemId: true,
          cantidad: true,
        },
      },
    },
  });

  const unidadByItem = new Map<string, number>();
  for (const operacion of operaciones) {
    const factor = stockOperacionDeltaFactor(operacion.tipo);
    for (const item of operacion.items) {
      const key = item.itemId.toString();
      unidadByItem.set(key, (unidadByItem.get(key) ?? 0) + item.cantidad * factor);
    }
  }

  return unidadByItem;
}

export async function buildPersonalByItemMap(prisma: PrismaLike) {
  const movimientos = await prisma.movimiento.findMany({
    where: {
      tipo: {
        in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION],
      },
    },
    select: {
      tipo: true,
      items: {
        select: {
          itemId: true,
          cantidad: true,
        },
      },
    },
  });

  const personalByItem = new Map<string, number>();
  for (const movimiento of movimientos) {
    const factor = movimientoPersonalDeltaFactor(movimiento.tipo);
    if (factor === 0) continue;
    for (const item of movimiento.items) {
      const key = item.itemId.toString();
      personalByItem.set(key, (personalByItem.get(key) ?? 0) + item.cantidad * factor);
    }
  }

  return personalByItem;
}

export async function buildPrestamoActivoByItemMap(prisma: Pick<Prisma.TransactionClient, "prestamoActivo">) {
  const prestamosActivos = await prisma.prestamoActivo.findMany({
    select: {
      movimiento: {
        select: {
          items: {
            select: {
              itemId: true,
              cantidad: true,
            },
          },
        },
      },
    },
  });

  const prestamoByItem = new Map<string, number>();
  for (const prestamo of prestamosActivos) {
    for (const item of prestamo.movimiento.items) {
      const key = item.itemId.toString();
      prestamoByItem.set(key, (prestamoByItem.get(key) ?? 0) + item.cantidad);
    }
  }

  return prestamoByItem;
}

export function totalStockUnits(stockByItem: Map<string, number>) {
  let total = 0;
  for (const value of stockByItem.values()) {
    total += value;
  }
  return total;
}
