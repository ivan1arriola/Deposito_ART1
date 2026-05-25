import { beforeEach, describe, expect, it, vi } from "vitest";
import { calcularStockArticulo, calcularStockTodos } from "@/lib/stock-calc";

const mockPrisma = {
  articuloStockMovimiento: {
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("calcularStockArticulo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcula stock = ingresos - egresos para un articulo", async () => {
    mockPrisma.articuloStockMovimiento.aggregate
      .mockResolvedValueOnce({ _sum: { cantidad: 50 } }) // INGRESO
      .mockResolvedValueOnce({ _sum: { cantidad: 15 } }); // EGRESO

    const stock = await calcularStockArticulo(1, mockPrisma as never);

    expect(stock).toBe(35);
    expect(mockPrisma.articuloStockMovimiento.aggregate).toHaveBeenCalledTimes(2);
    expect(mockPrisma.articuloStockMovimiento.aggregate).toHaveBeenNthCalledWith(1, {
      where: { articuloId: 1, tipo: "INGRESO" },
      _sum: { cantidad: true },
    });
    expect(mockPrisma.articuloStockMovimiento.aggregate).toHaveBeenNthCalledWith(2, {
      where: { articuloId: 1, tipo: "EGRESO" },
      _sum: { cantidad: true },
    });
  });

  it("retorna 0 si no hay movimientos", async () => {
    mockPrisma.articuloStockMovimiento.aggregate
      .mockResolvedValueOnce({ _sum: { cantidad: null } }) // INGRESO
      .mockResolvedValueOnce({ _sum: { cantidad: null } }); // EGRESO

    const stock = await calcularStockArticulo(1, mockPrisma as never);

    expect(stock).toBe(0);
  });

  it("retorna stock negativo si hay mas egresos que ingresos", async () => {
    mockPrisma.articuloStockMovimiento.aggregate
      .mockResolvedValueOnce({ _sum: { cantidad: 5 } })
      .mockResolvedValueOnce({ _sum: { cantidad: 10 } });

    const stock = await calcularStockArticulo(1, mockPrisma as never);

    expect(stock).toBe(-5);
  });

  it("retorna total de ingresos si no hay egresos", async () => {
    mockPrisma.articuloStockMovimiento.aggregate
      .mockResolvedValueOnce({ _sum: { cantidad: 100 } })
      .mockResolvedValueOnce({ _sum: { cantidad: null } });

    const stock = await calcularStockArticulo(1, mockPrisma as never);

    expect(stock).toBe(100);
  });
});

describe("calcularStockTodos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agrupa ingresos y egresos por articulo", async () => {
    mockPrisma.articuloStockMovimiento.groupBy.mockResolvedValue([
      { articuloId: 1, tipo: "INGRESO", _sum: { cantidad: 50 } },
      { articuloId: 1, tipo: "EGRESO", _sum: { cantidad: 15 } },
      { articuloId: 2, tipo: "INGRESO", _sum: { cantidad: 20 } },
      { articuloId: 2, tipo: "EGRESO", _sum: { cantidad: 8 } },
      { articuloId: 3, tipo: "INGRESO", _sum: { cantidad: 10 } },
    ]);

    const stockMap = await calcularStockTodos(mockPrisma as never);

    expect(stockMap.get(1)).toBe(35);
    expect(stockMap.get(2)).toBe(12);
    expect(stockMap.get(3)).toBe(10);
  });

  it("retorna map vacio si no hay movimientos", async () => {
    mockPrisma.articuloStockMovimiento.groupBy.mockResolvedValue([]);

    const stockMap = await calcularStockTodos(mockPrisma as never);

    expect(stockMap.size).toBe(0);
  });

  it("maneja articulo con solo egresos", async () => {
    mockPrisma.articuloStockMovimiento.groupBy.mockResolvedValue([
      { articuloId: 1, tipo: "EGRESO", _sum: { cantidad: 5 } },
    ]);

    const stockMap = await calcularStockTodos(mockPrisma as never);

    expect(stockMap.get(1)).toBe(-5);
  });
});
