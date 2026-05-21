import { describe, expect, it } from "vitest";

import { filterArticuloEntregasHistorial, type ArticuloEntregaHistorialEntry } from "./articulo-entregas-history";

const SAMPLE_ENTREGAS: ArticuloEntregaHistorialEntry[] = [
  {
    articuloEntregaPersonalId: "301",
    personalCi: "12345672",
    personalLabel: "Sdo. Gomez, Luis",
    ordenanteCi: "12345688",
    ordenanteLabel: "Cap. Lopez, Mario",
    usuarioEntregaId: "usr-1",
    usuarioEntregaLabel: "Tte. Perez, Ana",
    fecha: "2026-05-20",
    comentario: "Entrega semanal",
    items: [
      {
        articuloId: 1,
        nombre: "Block de Hojas A4",
        tipo: "OFICINA",
        cantidad: 5,
      },
    ],
  },
  {
    articuloEntregaPersonalId: "302",
    personalCi: "99887766",
    personalLabel: "Sgto. Diaz, Pedro",
    ordenanteCi: "12345688",
    ordenanteLabel: "Cap. Lopez, Mario",
    usuarioEntregaId: "usr-2",
    usuarioEntregaLabel: "Tte. Perez, Ana",
    fecha: "2026-05-10",
    comentario: null,
    items: [
      {
        articuloId: 2,
        nombre: "Lavandina",
        tipo: "LIMPIEZA",
        cantidad: 2,
      },
    ],
  },
];

describe("filterArticuloEntregasHistorial", () => {
  it("filtra por texto en artículos y comentarios", () => {
    expect(filterArticuloEntregasHistorial(SAMPLE_ENTREGAS, { searchTerm: "block" })).toHaveLength(1);
    expect(filterArticuloEntregasHistorial(SAMPLE_ENTREGAS, { searchTerm: "semanal" })).toHaveLength(1);
    expect(filterArticuloEntregasHistorial(SAMPLE_ENTREGAS, { searchTerm: "lavandina" })).toHaveLength(1);
  });

  it("filtra por rango de fechas ISO", () => {
    const filtered = filterArticuloEntregasHistorial(SAMPLE_ENTREGAS, {
      startDate: "2026-05-15",
      endDate: "2026-05-21",
    });

    expect(filtered).toEqual([SAMPLE_ENTREGAS[0]]);
  });

  it("combina filtros de texto y fecha", () => {
    const filtered = filterArticuloEntregasHistorial(SAMPLE_ENTREGAS, {
      searchTerm: "diaz",
      startDate: "2026-05-01",
      endDate: "2026-05-15",
    });

    expect(filtered).toEqual([SAMPLE_ENTREGAS[1]]);
  });
});
