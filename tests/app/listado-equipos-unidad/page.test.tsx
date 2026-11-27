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
          nombre: "Equipo Z",
          tipoEquipoId: null,
          tipoEquipo: null,
          ordenPdf: 1,
          existenciaSie: 110,
        },
        {
          equipoId: 2n,
          nombre: "Equipo A",
          tipoEquipoId: null,
          tipoEquipo: null,
          ordenPdf: 2,
          existenciaSie: 50,
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
    const table = screen.getByRole("table");
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
    for (const name of ["Equipo Z", "Equipo A"])
      expect(cellsFor(name)).toHaveLength(headers.length);
  });

  it("muestra asignaciones no nulas y conserva cero cuando no existen", async () => {
    await renderReport();
    expect(cellsFor("Equipo Z")).toEqual(["Equipo Z", "40", "25", "10", "25", "100", "110"]);
    expect(cellsFor("Equipo A")).toEqual(["Equipo A", "10", "0", "5", "35", "50", "50"]);
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

  it("mantiene el orden solicitado y menciona recintos en el desglose", async () => {
    await renderReport();
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(rows[1]).getAllByRole("cell")[0].textContent).toBe(first);
    expect(screen.getByText(/Totales por equipo/i).textContent).toMatch(/recintos/i);
  });
});
