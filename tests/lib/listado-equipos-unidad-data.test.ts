import { describe, expect, it } from "vitest";
import {
  buildListadoEquiposUnidadModel,
  computeEquipoStockTotals,
} from "@/lib/listado-equipos-unidad-data";

describe("listado-equipos-unidad-data", () => {
  it("calcula totales compartidos con conciliación exacta e independiente de existencia SIE", () => {
    const model = buildListadoEquiposUnidadModel(
      [
        {
          equipoId: 1n,
          nombre: "Mochila Táctica de Campaña Impermeable de Gran Capacidad 80L",
          tipoEquipoId: 10,
          tipoEquipo: { tipoEquipoId: 10, clave: "campana", nombre: "Campaña", orden: 2 },
          ordenPdf: 2,
          existenciaSie: 999,
        },
        {
          equipoId: 2n,
          nombre: "Casco Balístico Nivel IIIA",
          tipoEquipoId: null,
          tipoEquipo: null,
          ordenPdf: 1,
          existenciaSie: 0,
        },
      ],
      {
        unidadByItem: new Map([
          ["1", 50],
          ["2", 0],
        ]),
        personalByItem: new Map([["1", 20]]),
        asignacionByItem: new Map([["1", 12]]),
        prestamoByItem: new Map([["1", 8]]),
      },
      false
    );

    expect(model.totals).toEqual({
      totalSubalternos: 20,
      totalAsignacion: 12,
      totalPrestamo: 8,
      totalDeposito: 10,
      totalUnidad: 50,
    });
    expect(
      model.totals.totalSubalternos +
        model.totals.totalAsignacion +
        model.totals.totalPrestamo +
        model.totals.totalDeposito
    ).toBe(model.totals.totalUnidad);

    expect(model.resumenPorTipo.map((s) => s.title)).toEqual([
      "Equipos General",
      "Equipos Campaña",
    ]);

    const alpha = buildListadoEquiposUnidadModel(
      [
        {
          equipoId: 1n,
          nombre: "Zeta",
          tipoEquipoId: null,
          tipoEquipo: null,
          ordenPdf: 1,
          existenciaSie: 5,
        },
        {
          equipoId: 2n,
          nombre: "Alfa",
          tipoEquipoId: null,
          tipoEquipo: null,
          ordenPdf: 2,
          existenciaSie: 5,
        },
      ],
      {
        unidadByItem: new Map(),
        personalByItem: new Map(),
        asignacionByItem: new Map(),
        prestamoByItem: new Map(),
      },
      true
    );

    expect(alpha.resumenPorTipo[0]?.title).toBe("Equipos General (A-Z)");
    expect(alpha.resumenPorTipo[0]?.equipos.map((e) => e.nombre)).toEqual(["Alfa", "Zeta"]);
    expect(computeEquipoStockTotals(alpha.resumen)).toEqual({
      totalSubalternos: 0,
      totalAsignacion: 0,
      totalPrestamo: 0,
      totalDeposito: 0,
      totalUnidad: 0,
    });
  });
});
