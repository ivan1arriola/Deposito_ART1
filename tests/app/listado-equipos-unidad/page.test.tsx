// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import ListadoEquiposUnidadPage from "@/app/listado-equipos-unidad/page";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    equipo: {
      findMany: vi.fn(async () => [
        {
          equipoId: 1n,
          nombre: "Equipo Z con Nombre Largo de Dotación Reglamentaria para Campaña",
          tipoEquipoId: null,
          tipoEquipo: null,
          ordenPdf: 1,
          existenciaSie: 110,
        },
        {
          equipoId: 2n,
          nombre: "Equipo A",
          tipoEquipoId: 10,
          tipoEquipo: { tipoEquipoId: 10, clave: "campana", nombre: "Campaña", orden: 2 },
          ordenPdf: 2,
          existenciaSie: 50,
        },
        {
          equipoId: 3n,
          nombre: "Equipo Cero",
          tipoEquipoId: 10,
          tipoEquipo: { tipoEquipoId: 10, clave: "campana", nombre: "Campaña", orden: 3 },
          ordenPdf: 3,
          existenciaSie: 0,
        },
      ]),
    },
  },
}));
vi.mock("@/lib/stock", () => ({
  buildStockSummaryMaps: vi.fn(async () => ({
    unidadByItem: new Map([
      ["1", 100],
      ["2", 50],
      ["3", 0],
    ]),
    personalByItem: new Map([
      ["1", 40],
      ["2", 10],
    ]),
    asignacionByItem: new Map([["1", 25]]),
    prestamoByItem: new Map([
      ["1", 10],
      ["2", 5],
    ]),
  })),
}));
vi.mock("@/lib/firma-config", () => ({
  TEXTO_ENCARGADO: "Encargado",
  TEXTO_OFICIAL: "Oficial",
  getFirmaConfig: vi.fn(async () => ({
    encargadoRango: "",
    encargadoNombre: "",
    oficialRango: "",
    oficialNombre: "",
  })),
}));
vi.mock("@/app/components/AutoPrintOnLoad", () => ({ AutoPrintOnLoad: () => null }));

afterEach(cleanup);

const modes = [
  { label: "orden asignado", sort: undefined, first: "Equipo Z" },
  { label: "orden alfabético", sort: "alpha", first: "Equipo A" },
];

describe.each(modes)("INC-007: impresión por $label", ({ sort, first }) => {
  async function renderReport() {
    render(
      await ListadoEquiposUnidadPage({ searchParams: Promise.resolve({ sort, autoprint: "1" }) })
    );
  }

  function cellsFor(name: string) {
    const row = screen.getByRole("row", { name: new RegExp(name) });
    return within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent?.trim());
  }

  it("presenta Recintos como columna independiente y alinea encabezados y celdas", async () => {
    await renderReport();
    const tables = screen.getAllByRole("table");
    expect(tables.length).toBe(2);
    for (const table of tables) {
      const headers = within(table).getAllByRole("columnheader");
      expect(headers.map((h) => h.textContent)).toEqual([
        "Equipo",
        "Subalternos",
        "Recintos",
        "Préstamo",
        "Deposito",
        "Unidad",
        "Existencia SIE",
      ]);
      expect(table.querySelectorAll("col")).toHaveLength(headers.length);
    }
    for (const name of [
      "Equipo Z con Nombre Largo de Dotación Reglamentaria para Campaña",
      "Equipo A",
      "Equipo Cero",
    ]) {
      expect(cellsFor(name)).toHaveLength(7);
    }
  });

  it("muestra asignaciones no nulas y conserva cero cuando no existen", async () => {
    await renderReport();
    expect(cellsFor("Equipo Z con Nombre Largo de Dotación Reglamentaria para Campaña")).toEqual([
      "Equipo Z con Nombre Largo de Dotación Reglamentaria para Campaña",
      "40",
      "25",
      "10",
      "25",
      "100",
      "110",
    ]);
    expect(cellsFor("Equipo A")).toEqual(["Equipo A", "10", "0", "5", "35", "50", "50"]);
    expect(cellsFor("Equipo Cero")).toEqual(["Equipo Cero", "0", "0", "0", "0", "0", "0"]);
  });

  it("incluye el total de recintos y concilia las categorías sin sumar existencia SIE", async () => {
    await renderReport();
    const total = (label: RegExp) => {
      const element = screen.getByText(label).closest("article");
      expect(element).not.toBeNull();
      return Number(element?.querySelector(".totals-value")?.textContent);
    };
    const recintos = total(/^Total recintos$/i);
    expect(recintos).toBe(25);
    expect(
      total(/^Total subalternos$/i) +
        recintos +
        total(/^Total pr[eé]stamo$/i) +
        total(/^Total dep[oó]sito$/i)
    ).toBe(total(/^Total unidad$/i));
    expect(total(/^Total unidad$/i)).toBe(150);
  });

  it("mantiene el orden solicitado por categoría y menciona recintos en el desglose", async () => {
    await renderReport();
    const tables = screen.getAllByRole("table");
    const firstGeneralRow = within(tables[0]).getAllByRole("row")[1];
    expect(within(firstGeneralRow).getAllByRole("cell")[0].textContent).toBe(
      "Equipo Z con Nombre Largo de Dotación Reglamentaria para Campaña"
    );
    const firstCampanaRow = within(tables[1]).getAllByRole("row")[1];
    expect(within(firstCampanaRow).getAllByRole("cell")[0].textContent).toBe("Equipo A");
    expect(first).toBeTruthy();
    expect(screen.getByText(/Totales por equipo/i).textContent).toMatch(/recintos/i);
  });
});
