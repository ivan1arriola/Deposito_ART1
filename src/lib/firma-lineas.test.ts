import { buildFirmasHojaEntregaLineas } from "@/lib/firma-lineas";

describe("buildFirmasHojaEntregaLineas", () => {
  it("reinicia la sangria en cada bloque de firma de la hoja de entrega", () => {
    const lineas = buildFirmasHojaEntregaLineas({
      alistadoRango: "Sgto.",
      alistadoNombre: "Nelson Aguirre",
      encargadoTexto: "Texto encargado",
      encargadoRango: "Sgto.",
      encargadoNombre: "Wilson Lara",
      oficialTexto: "Texto oficial",
      oficialRango: "Tte. 2 | (Apy)",
      oficialNombre: "Gerardo Otero",
    });

    expect(
      lineas.map((linea) => ({
        key: linea.key,
        indentLevel: linea.indentLevel,
        isBold: Boolean(linea.isBold),
      })),
    ).toEqual([
      { key: "alistado-titulo", indentLevel: 0, isBold: false },
      { key: "alistado-rango", indentLevel: 1, isBold: true },
      { key: "alistado-nombre", indentLevel: 2, isBold: false },
      { key: "encargado-texto", indentLevel: 1, isBold: false },
      { key: "encargado-rango", indentLevel: 2, isBold: true },
      { key: "encargado-nombre", indentLevel: 3, isBold: false },
      { key: "oficial-texto", indentLevel: 2, isBold: false },
      { key: "oficial-rango", indentLevel: 3, isBold: true },
      { key: "oficial-nombre", indentLevel: 4, isBold: false },
    ]);
  });
});
