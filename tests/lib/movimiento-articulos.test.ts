import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyMovimientoArticulosDelta, parseArticulosPayload } from "@/lib/movimiento-articulos";

describe("movimiento-articulos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parseArticulosPayload valida, rechaza inválidos y deduplica artículos repetidos", () => {
    expect(parseArticulosPayload(undefined)).toEqual({ ok: true, items: [] });
    expect(parseArticulosPayload("invalido")).toEqual({
      ok: false,
      error: "La lista de artículos es inválida.",
    });
    expect(parseArticulosPayload([null])).toEqual({
      ok: false,
      error: "Cada artículo debe incluir articuloId y cantidad.",
    });
    expect(parseArticulosPayload([{ articuloId: 0, cantidad: 2 }])).toEqual({
      ok: false,
      error: "Cada artículo debe incluir articuloId y cantidad con enteros positivos.",
    });
    expect(
      parseArticulosPayload([
        { articuloId: 3, cantidad: 2 },
        { articuloId: "3", cantidad: "4" },
      ])
    ).toEqual({
      ok: true,
      items: [{ articuloId: 3, cantidad: 6 }],
    });
  });

  it("applyMovimientoArticulosDelta retorna vacío si no hay artículos previos ni nuevos", async () => {
    const fakeTx = {} as never;
    const res = await applyMovimientoArticulosDelta(fakeTx, 1n, [], [], "Sin cambios");
    expect(res).toEqual([]);
  });

  it("applyMovimientoArticulosDelta bloquea artículos ordenados, registra egresos e ingresos por diferencia y falla si no existe o falta stock", async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    const findMany = vi.fn().mockResolvedValue([
      { articuloId: 1, nombre: "Jabón", tipo: "LIMPIEZA" },
      { articuloId: 2, nombre: "Detergente", tipo: "LIMPIEZA" },
    ]);
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce({ _sum: { cantidad: 10 } })
      .mockResolvedValueOnce({ _sum: { cantidad: 2 } });
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const createManyArt = vi.fn().mockResolvedValue({ count: 1 });
    const createManyMov = vi.fn().mockResolvedValue({ count: 2 });

    const fakeTx = {
      $queryRaw: queryRaw,
      articulo: { findMany },
      articuloStockMovimiento: { aggregate, createMany: createManyMov },
      movimientoArticulo: { deleteMany, createMany: createManyArt },
    } as never;

    const result = await applyMovimientoArticulosDelta(
      fakeTx,
      99n,
      [
        { articuloId: 1, cantidad: 2 },
        { articuloId: 2, cantidad: 5 },
      ],
      [{ articuloId: 1, cantidad: 6 }],
      "Rectificación"
    );

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toEqual([{ articuloId: 1, nombre: "Jabón", tipo: "LIMPIEZA", cantidad: 6 }]);
    expect(createManyMov).toHaveBeenCalledWith({
      data: [
        {
          articuloId: 1,
          tipo: "EGRESO",
          cantidad: 4,
          comentario: "Rectificación",
          movimientoId: 99n,
        },
        {
          articuloId: 2,
          tipo: "INGRESO",
          cantidad: 5,
          comentario: "Rectificación (compensación)",
          movimientoId: 99n,
        },
      ],
    });

    const missingTx = {
      $queryRaw: vi.fn(),
      articulo: { findMany: vi.fn().mockResolvedValue([]) },
    } as never;
    await expect(
      applyMovimientoArticulosDelta(missingTx, 1n, [], [{ articuloId: 99, cantidad: 1 }], "Test")
    ).rejects.toThrow("ARTICULO_NOT_FOUND");

    const lowStockTx = {
      $queryRaw: vi.fn(),
      articulo: {
        findMany: vi.fn().mockResolvedValue([{ articuloId: 1, nombre: "Jabón", tipo: "LIMPIEZA" }]),
      },
      articuloStockMovimiento: {
        aggregate: vi
          .fn()
          .mockResolvedValueOnce({ _sum: { cantidad: 1 } })
          .mockResolvedValueOnce({ _sum: { cantidad: 0 } }),
      },
    } as never;
    await expect(
      applyMovimientoArticulosDelta(lowStockTx, 1n, [], [{ articuloId: 1, cantidad: 5 }], "Test")
    ).rejects.toThrow("INSUFFICIENT_STOCK:Jabón");
  });
});
