import { Prisma, TipoRegistro, TipoStockOperacion } from "@prisma/client";

type PrismaLike = Pick<Prisma.TransactionClient, "registro" | "stockOperacion">;

type StockMapOptions = {
  excludeRegistroId?: bigint | null;
};

export function registroStockDeltaFactor(tipo: TipoRegistro | "ENTREGA" | "DEVOLUCION" | "AJUSTE") {
  switch (tipo) {
    case TipoRegistro.ENTREGA:
    case "ENTREGA":
      return -1;
    case TipoRegistro.DEVOLUCION:
    case "DEVOLUCION":
      return 1;
    default:
      return 0;
  }
}

export function registroPersonalDeltaFactor(tipo: TipoRegistro | "ENTREGA" | "DEVOLUCION" | "AJUSTE") {
  switch (tipo) {
    case TipoRegistro.ENTREGA:
    case "ENTREGA":
      return 1;
    case TipoRegistro.DEVOLUCION:
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
  const [registros, operaciones] = await Promise.all([
    prisma.registro.findMany({
      where: {
        afectaStock: true,
        ...(options.excludeRegistroId ? { registroId: { not: options.excludeRegistroId } } : {}),
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
  ]);

  const stockByItem = new Map<string, number>();

  for (const registro of registros) {
    const factor = registroStockDeltaFactor(registro.tipo);
    if (factor === 0) continue;
    for (const item of registro.items) {
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

  return stockByItem;
}

export async function buildPersonalByItemMap(prisma: PrismaLike) {
  const registros = await prisma.registro.findMany({
    where: {
      tipo: {
        in: [TipoRegistro.ENTREGA, TipoRegistro.DEVOLUCION],
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
  for (const registro of registros) {
    const factor = registroPersonalDeltaFactor(registro.tipo);
    if (factor === 0) continue;
    for (const item of registro.items) {
      const key = item.itemId.toString();
      personalByItem.set(key, (personalByItem.get(key) ?? 0) + item.cantidad * factor);
    }
  }

  return personalByItem;
}

export function totalStockUnits(stockByItem: Map<string, number>) {
  let total = 0;
  for (const value of stockByItem.values()) {
    total += value;
  }
  return total;
}
