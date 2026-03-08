import { Prisma, TipoMovimiento, TipoStockOperacion } from "@prisma/client";

type PrismaLike = Pick<Prisma.TransactionClient, "movimiento" | "stockOperacion" | "prestamoActivo">;

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
