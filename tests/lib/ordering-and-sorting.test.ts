import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { clampCatalogPosition, compareOptionalOrder, moveCatalogId } from "@/lib/catalog-order";
import { applyEquipoOrder, getOrderedEquipoIds, insertEquipoAtOrder } from "@/lib/equipo-ordering";
import {
  compareEquipoNombre,
  compareEquiposByTipoAndName,
  compareEquiposByTipoAndOrder,
  groupEquiposByTipo,
} from "@/lib/equipo-sort";
import {
  applyMovimientosEquipoTipoFilters,
  DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS,
  parseMovimientosEquipoTipoFilters,
  serializeMovimientosEquipoTipoFilters,
} from "@/lib/movimientos-equipo-filters";
import {
  DEFAULT_MOVIMIENTOS_EQUIPO_SORT,
  sortMovimientosEquipoRows,
} from "@/lib/movimientos-equipo-sort";
import {
  DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT,
  parseMovimientosFueraHojaSort,
  sortMovimientosFueraHojaRows,
} from "@/lib/movimientos-fuera-hoja-sort";
import {
  comparePersonalByHierarchy,
  compareRankAbbreviation,
  compareRanks,
  rankPriority,
} from "@/lib/rank-order";
import {
  applyTipoEquipoOrder,
  getOrderedTipoEquipoIds,
  insertTipoEquipoAtOrder,
} from "@/lib/tipo-equipo-ordering";
import type { EquipoMovimientoViewRow } from "@/types/views";

describe("catalog-order", () => {
  it("compareOptionalOrder coloca nulos/undefined al final y compara números", () => {
    expect(compareOptionalOrder(null, undefined)).toBe(0);
    expect(compareOptionalOrder(null, 1)).toBe(1);
    expect(compareOptionalOrder(undefined, 2)).toBe(1);
    expect(compareOptionalOrder(3, null)).toBe(-1);
    expect(compareOptionalOrder(2, 5)).toBeLessThan(0);
  });

  it("clampCatalogPosition y moveCatalogId reubican elementos dentro de límites válidos", () => {
    expect(clampCatalogPosition(0, 5)).toBe(1);
    expect(clampCatalogPosition(99, 5)).toBe(5);
    expect(clampCatalogPosition(2, 0)).toBe(1);

    expect(moveCatalogId([10, 20, 30, 40], 30, 1)).toEqual([30, 10, 20, 40]);
    expect(moveCatalogId([10, 20, 30, 40], 10, 99)).toEqual([20, 30, 40, 10]);
    expect(moveCatalogId([10, 20], 99, 2)).toEqual([10, 99, 20]);
  });
});

describe("equipo-ordering", () => {
  it("getOrderedEquipoIds consulta con o sin excludeItemId", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([{ equipoId: BigInt(1) }, { equipoId: BigInt(2) }])
      .mockResolvedValueOnce([{ equipoId: BigInt(2) }]);
    const tx = { equipo: { findMany } } as unknown as Prisma.TransactionClient;

    expect(await getOrderedEquipoIds(tx, true)).toEqual([BigInt(1), BigInt(2)]);
    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { activo: true },
      orderBy: [{ ordenPdf: "asc" }, { equipoId: "asc" }],
      select: { equipoId: true },
    });

    expect(await getOrderedEquipoIds(tx, false, BigInt(1))).toEqual([BigInt(2)]);
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { activo: false, equipoId: { not: BigInt(1) } },
      orderBy: [{ ordenPdf: "asc" }, { equipoId: "asc" }],
      select: { equipoId: true },
    });
  });

  it("insertEquipoAtOrder maneja listas vacías, reemplazos y límites", () => {
    expect(insertEquipoAtOrder([], BigInt(5), 3)).toEqual([BigInt(5)]);
    expect(insertEquipoAtOrder([BigInt(1), BigInt(2), BigInt(3)], BigInt(2), 1)).toEqual([
      BigInt(2),
      BigInt(1),
      BigInt(3),
    ]);
    expect(insertEquipoAtOrder([BigInt(1), BigInt(2)], BigInt(3), 10)).toEqual([
      BigInt(1),
      BigInt(2),
      BigInt(3),
    ]);
    expect(insertEquipoAtOrder([BigInt(1), BigInt(2)], BigInt(3), 0)).toEqual([
      BigInt(3),
      BigInt(1),
      BigInt(2),
    ]);
  });

  it("applyEquipoOrder omite listas vacías y ejecuta SQL en lote cuando hay IDs", async () => {
    const executeRaw = vi.fn().mockResolvedValue(2);
    const tx = { $executeRaw: executeRaw } as unknown as Prisma.TransactionClient;

    await applyEquipoOrder(tx, []);
    expect(executeRaw).not.toHaveBeenCalled();

    await applyEquipoOrder(tx, [BigInt(10), BigInt(20)], 5);
    expect(executeRaw).toHaveBeenCalledTimes(1);

    await applyEquipoOrder(tx, [BigInt(30)]);
    expect(executeRaw).toHaveBeenCalledTimes(2);
  });
});

describe("tipo-equipo-ordering", () => {
  it("getOrderedTipoEquipoIds consulta con o sin exclusión", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([{ tipoEquipoId: 1 }, { tipoEquipoId: 2 }])
      .mockResolvedValueOnce([{ tipoEquipoId: 2 }]);
    const tx = {
      tipoEquipoCatalogo: { findMany },
      $executeRaw: vi.fn(),
    } as unknown as Parameters<typeof getOrderedTipoEquipoIds>[0];

    expect(await getOrderedTipoEquipoIds(tx)).toEqual([1, 2]);
    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: undefined,
      orderBy: [{ orden: "asc" }, { nombre: "asc" }, { tipoEquipoId: "asc" }],
      select: { tipoEquipoId: true },
    });

    expect(await getOrderedTipoEquipoIds(tx, 1)).toEqual([2]);
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { tipoEquipoId: { not: 1 } },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }, { tipoEquipoId: "asc" }],
      select: { tipoEquipoId: true },
    });
  });

  it("insertTipoEquipoAtOrder maneja orden undefined, null, numérico y lista vacía", () => {
    expect(insertTipoEquipoAtOrder([], 7, 2)).toEqual([7]);
    expect(insertTipoEquipoAtOrder([1, 2], 3)).toEqual([1, 2, 3]);
    expect(insertTipoEquipoAtOrder([1, 2], 3, null)).toEqual([1, 2, 3]);
    expect(insertTipoEquipoAtOrder([1, 2, 3], 3, 1)).toEqual([3, 1, 2]);
    expect(insertTipoEquipoAtOrder([1, 2], 3, 0)).toEqual([3, 1, 2]);
  });

  it("applyTipoEquipoOrder omite listas vacías y ejecuta actualización cuando hay IDs", async () => {
    const executeRaw = vi.fn().mockResolvedValue(2);
    const tx = {
      tipoEquipoCatalogo: { findMany: vi.fn() },
      $executeRaw: executeRaw,
    } as unknown as Parameters<typeof applyTipoEquipoOrder>[0];

    await applyTipoEquipoOrder(tx, []);
    expect(executeRaw).not.toHaveBeenCalled();

    await applyTipoEquipoOrder(tx, [1, 2]);
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe("equipo-sort", () => {
  it("compara nombres y ordena por tipo y nombre o por tipo y ordenPdf", () => {
    expect(compareEquipoNombre("Árbol", "Zapato")).toBeLessThan(0);

    const a = { tipo: "GENERAL", nombre: "Zorro", ordenPdf: 2 };
    const b = { tipo: "GENERAL", tipoLabel: "  ", nombre: "Alfa", ordenPdf: 1 };
    const c = {
      tipo: "OPTICA",
      tipoLabel: "Óptica",
      tipoOrden: 1,
      nombre: "Binocular",
      ordenPdf: 3,
    };
    const d = { tipo: "ARMAMENTO", tipoOrden: Number.NaN, nombre: "Fusil", ordenPdf: 1 };
    const e = {
      tipo: "ARMAMENTO",
      tipoLabel: "Armamento",
      tipoOrden: 1,
      nombre: "Carabina",
      ordenPdf: 2,
    };

    expect(compareEquiposByTipoAndName(a, b)).toBeGreaterThan(0);
    expect(compareEquiposByTipoAndName(a, c)).toBeLessThan(0);
    expect(compareEquiposByTipoAndName(c, e)).toBeGreaterThan(0);
    expect(compareEquiposByTipoAndName(c, d)).toBeLessThan(0);

    expect(compareEquiposByTipoAndOrder(b, a)).toBeLessThan(0);
    expect(compareEquiposByTipoAndOrder(a, c)).toBeLessThan(0);
    expect(compareEquiposByTipoAndOrder(c, e)).toBeGreaterThan(0);
    expect(
      compareEquiposByTipoAndOrder(
        { tipo: "OPTICA", tipoOrden: 1, nombre: "Lupa B", ordenPdf: 1 },
        { tipo: "OPTICA", tipoOrden: 1, nombre: "Lupa A", ordenPdf: 1 }
      )
    ).toBeGreaterThan(0);
  });

  it("groupEquiposByTipo agrupa equipos por tipo y ordena secciones", () => {
    const sections = groupEquiposByTipo([
      { tipo: "ZETA", tipoOrden: 2, nombre: "Z1" },
      { tipo: "GENERAL", nombre: "G1" },
      { tipo: "ALFA", tipoLabel: "Alfa", tipoOrden: 2, nombre: "A1" },
      { tipo: "GENERAL", tipoLabel: "  ", nombre: "G2" },
    ]);

    expect(sections.map((s) => s.key)).toEqual(["GENERAL", "ALFA", "ZETA"]);
    expect(sections[0]).toMatchObject({
      key: "GENERAL",
      label: "General",
      order: 0,
    });
    expect(sections[0]?.equipos).toHaveLength(2);
    expect(sections[2]?.label).toBe("ZETA");
  });
});

describe("movimientos-equipo-filters", () => {
  const baseRow = (overrides: Partial<EquipoMovimientoViewRow>): EquipoMovimientoViewRow => ({
    movimientoId: "1",
    fecha: "10/05/2026",
    tipo: "ENTREGA",
    tipoLabel: "Entrega",
    prestamoEstado: null,
    clasePrestamo: null,
    ci: "12345678",
    perfilCi: null,
    persona: "Juan Pérez",
    gradoAbreviacion: "Sdo.",
    gradoOrden: 5,
    cantidad: 1,
    observaciones: null,
    ...overrides,
  });

  it("parsea y serializa filtros manejando nulos, vacíos, inválidos y duplicados", () => {
    expect(parseMovimientosEquipoTipoFilters(null)).toEqual(
      DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS
    );
    expect(parseMovimientosEquipoTipoFilters(undefined)).toEqual(
      DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS
    );
    expect(parseMovimientosEquipoTipoFilters("invalido, otro")).toEqual(
      DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS
    );
    expect(
      parseMovimientosEquipoTipoFilters(
        ` entrega , INVALIDO , entrega, ${"DEVOLUCION".toLowerCase()} `
      )
    ).toEqual(["ENTREGA", "DEVOLUCION"]);

    expect(serializeMovimientosEquipoTipoFilters([])).toBe(
      "ENTREGA,DEVOLUCION,ASIGNACION,PRESTAMO_PENDIENTE"
    );
    expect(serializeMovimientosEquipoTipoFilters(["ASIGNACION", "PRESTAMO_PENDIENTE"])).toBe(
      "ASIGNACION,PRESTAMO_PENDIENTE"
    );
  });

  it("filtra filas de movimientos por tipo y estado de préstamo pendiente", () => {
    const rows = [
      baseRow({ movimientoId: "1", tipo: "ENTREGA" }),
      baseRow({ movimientoId: "2", tipo: "DEVOLUCION" }),
      baseRow({ movimientoId: "3", tipo: "ASIGNACION" }),
      baseRow({ movimientoId: "4", tipo: "PRESTAMO", prestamoEstado: "PENDIENTE" }),
      baseRow({ movimientoId: "5", tipo: "PRESTAMO", prestamoEstado: "DEVUELTO" }),
    ];

    expect(
      applyMovimientosEquipoTipoFilters(rows, ["ENTREGA", "PRESTAMO_PENDIENTE"]).map(
        (r) => r.movimientoId
      )
    ).toEqual(["1", "4"]);
    expect(
      applyMovimientosEquipoTipoFilters(rows, ["DEVOLUCION", "ASIGNACION"]).map(
        (r) => r.movimientoId
      )
    ).toEqual(["2", "3"]);
  });
});

describe("movimientos-equipo-sort", () => {
  it("ordena por fecha y por tipo en ascendente y descendente con desempates completos", () => {
    expect(DEFAULT_MOVIMIENTOS_EQUIPO_SORT).toEqual({ field: "fecha", direction: "desc" });

    const rows = [
      { movimientoId: "2", fecha: "10/05/2026", tipoLabel: "Entrega", persona: "Beto" },
      { movimientoId: "2", fecha: "10/05/2026", tipoLabel: "Entrega", persona: "Ana" },
      { movimientoId: "10", fecha: "10/05/2026", tipoLabel: "Devolución", persona: "Carlos" },
      { movimientoId: "1", fecha: "inválida", tipoLabel: "Asignación", persona: "Diego" },
      { movimientoId: "0", fecha: "inválida-2", tipoLabel: "Asignación", persona: "Elena" },
    ];

    const byDateAsc = sortMovimientosEquipoRows(rows, { field: "fecha", direction: "asc" });
    expect(byDateAsc.map((r) => `${r.movimientoId}:${r.persona}`)).toEqual([
      "0:Elena",
      "1:Diego",
      "2:Ana",
      "2:Beto",
      "10:Carlos",
    ]);

    const byTipoDesc = sortMovimientosEquipoRows(rows, { field: "tipo", direction: "desc" });
    expect(byTipoDesc.map((r) => `${r.tipoLabel}:${r.persona}`)).toEqual([
      "Entrega:Beto",
      "Entrega:Ana",
      "Devolución:Carlos",
      "Asignación:Diego",
      "Asignación:Elena",
    ]);
  });
});

describe("movimientos-fuera-hoja-sort", () => {
  it("parsea parámetros de ordenamiento con valores válidos e inválidos", () => {
    expect(DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT).toEqual({ field: "fecha", direction: "desc" });
    expect(parseMovimientosFueraHojaSort("equipo", "asc")).toEqual({
      field: "equipo",
      direction: "asc",
    });
    expect(parseMovimientosFueraHojaSort("grado", "desc")).toEqual({
      field: "grado",
      direction: "desc",
    });
    expect(parseMovimientosFueraHojaSort("fecha", "asc")).toEqual({
      field: "fecha",
      direction: "asc",
    });
    expect(parseMovimientosFueraHojaSort("otro", null)).toEqual(
      DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT
    );
  });

  it("ordena por fecha, equipo y grado incluyendo desempates y órdenes nulos", () => {
    const rows = [
      {
        movimientoId: "2",
        fecha: "15/05/2026",
        persona: "Beto",
        gradoAbreviacion: "Cabo",
        gradoOrden: 2,
        equipo: "Casco",
      },
      {
        movimientoId: "10",
        fecha: "15/05/2026",
        persona: "Ana",
        gradoAbreviacion: "Sgto.",
        gradoOrden: 2,
        equipo: "Casco",
      },
      {
        movimientoId: "1",
        fecha: "15/05/2026",
        persona: "Ana",
        gradoAbreviacion: "Sgto.",
        gradoOrden: 2,
        equipo: "Botas",
      },
      {
        movimientoId: "3",
        fecha: "sin-fecha",
        persona: "Zoe",
        gradoAbreviacion: "Sdo.",
        gradoOrden: null,
        equipo: "Mochila",
      },
      {
        movimientoId: "4",
        fecha: "otra-sin-fecha",
        persona: "Yael",
        gradoAbreviacion: "Sdo.",
        gradoOrden: null,
        equipo: "Mochila",
      },
      {
        movimientoId: "2",
        fecha: "15/05/2026",
        persona: "Ana",
        gradoAbreviacion: "Sgto.",
        gradoOrden: 2,
        equipo: "Casco",
      },
    ];

    const byFechaAsc = sortMovimientosFueraHojaRows(rows, { field: "fecha", direction: "asc" });
    expect(byFechaAsc[0]?.movimientoId).toBe("3");
    expect(byFechaAsc[1]?.movimientoId).toBe("4");
    expect(byFechaAsc[2]?.equipo).toBe("Botas");

    const byEquipoAsc = sortMovimientosFueraHojaRows(rows, { field: "equipo", direction: "asc" });
    expect(byEquipoAsc[0]?.equipo).toBe("Botas");
    expect(byEquipoAsc[1]?.persona).toBe("Ana");
    expect(byEquipoAsc[1]?.movimientoId).toBe("2");

    const byGradoDesc = sortMovimientosFueraHojaRows(rows, { field: "grado", direction: "desc" });
    expect(byGradoDesc[0]?.gradoOrden).toBeNull();
    expect(byGradoDesc[byGradoDesc.length - 1]?.gradoAbreviacion).toBe("Cabo");
  });
});

describe("rank-order", () => {
  it("calcula prioridad de grados y compara abreviaciones y rangos", () => {
    expect(rankPriority("Sgto. 1º")).toBe(1);
    expect(rankPriority("Cabo 1°")).toBe(2);
    expect(rankPriority("Cabo 2º")).toBe(3);
    expect(rankPriority("Sdo. 1ª")).toBe(4);
    expect(rankPriority("Tte. 1º")).toBe(99);

    expect(compareRankAbbreviation("Sgto.", "Cabo 1º")).toBeLessThan(0);
    expect(compareRankAbbreviation("Cabo 1º B", "Cabo 1º A")).toBeGreaterThan(0);

    expect(
      compareRanks({ abreviacion: "Sdo. 1ª", orden: 1 }, { abreviacion: "Sgto.", orden: 2 })
    ).toBeLessThan(0);
    expect(
      compareRanks({ abreviacion: "Sgto.", orden: null }, { abreviacion: "Cabo 1º" })
    ).toBeLessThan(0);
  });

  it("comparePersonalByHierarchy desempata por rango, apellidos, nombres y CI", () => {
    const base = {
      ci: "10000001",
      apellido1: "García",
      apellido2: null as string | null,
      nombre1: "Juan",
      nombre2: null as string | null,
      rango: { abreviacion: "Cabo 1º", orden: 2 },
    };

    expect(
      comparePersonalByHierarchy({ ...base, rango: { abreviacion: "Sgto.", orden: 1 } }, base)
    ).toBeLessThan(0);
    expect(comparePersonalByHierarchy({ ...base, apellido1: "Acosta" }, base)).toBeLessThan(0);
    expect(comparePersonalByHierarchy({ ...base, apellido2: "López" }, base)).toBeGreaterThan(0);
    expect(comparePersonalByHierarchy({ ...base, nombre1: "Carlos" }, base)).toBeLessThan(0);
    expect(comparePersonalByHierarchy({ ...base, nombre2: "Alberto" }, base)).toBeGreaterThan(0);
    expect(comparePersonalByHierarchy({ ...base, ci: "10000002" }, base)).toBeGreaterThan(0);
    expect(comparePersonalByHierarchy(base, { ...base })).toBe(0);
  });
});
