import { describe, it, expect } from "vitest";
import {
  buildFirmasHojaEntregaLineas,
  buildFirmasInstitucionalesLineas,
  getFirmaLineBaseIndentCss,
  getFirmaLineBaseIndentPt,
  getFirmaLineInlineOffsetCss,
  getFirmaLineInlineOffsetPt,
} from "@/lib/firma-lineas";

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
        inlineOffsetChars: linea.inlineOffsetChars ?? 0,
      }))
    ).toEqual([
      { key: "alistado-titulo", indentLevel: 0, isBold: false, inlineOffsetChars: 0 },
      { key: "alistado-rango", indentLevel: 0, isBold: true, inlineOffsetChars: 0 },
      { key: "alistado-nombre", indentLevel: 0, isBold: false, inlineOffsetChars: 5 },
      { key: "encargado-texto", indentLevel: 1, isBold: false, inlineOffsetChars: 0 },
      { key: "encargado-rango", indentLevel: 1, isBold: true, inlineOffsetChars: 0 },
      { key: "encargado-nombre", indentLevel: 1, isBold: false, inlineOffsetChars: 5 },
      { key: "oficial-texto", indentLevel: 2, isBold: false, inlineOffsetChars: 0 },
      { key: "oficial-rango", indentLevel: 2, isBold: true, inlineOffsetChars: 0 },
      { key: "oficial-nombre", indentLevel: 2, isBold: false, inlineOffsetChars: 14 },
    ]);
  });

  it("permite desplazar el bloque de autoridades manteniendo una sangria consecutiva", () => {
    const lineas = buildFirmasHojaEntregaLineas({
      alistadoRango: "Sgto.",
      alistadoNombre: "Nelson Aguirre",
      encargadoTexto: "Texto encargado",
      encargadoRango: "Sgto.",
      encargadoNombre: "Wilson Lara",
      oficialTexto: "Texto oficial",
      oficialRango: "Tte. 2 | (Apy)",
      oficialNombre: "Gerardo Otero",
      encargadoStartIndentLevel: 2,
    });

    expect(lineas.map((linea) => linea.indentLevel)).toEqual([0, 0, 0, 2, 2, 2, 3, 3, 3]);
  });
});

describe("buildFirmasInstitucionalesLineas", () => {
  it("hace que el oficial empiece una sangria mas a la derecha que el encargado", () => {
    const lineas = buildFirmasInstitucionalesLineas({
      encargadoTexto: "Texto encargado",
      encargadoRango: "Sgto.",
      encargadoNombre: "Wilson Lara",
      oficialTexto: "Texto oficial",
      oficialRango: "Tte. 2 (Apy)",
      oficialNombre: "Gerardo Otero",
    });

    expect(lineas.map((linea) => linea.indentLevel)).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it("mantiene la misma relacion al desplazar ambos bloques", () => {
    const lineas = buildFirmasInstitucionalesLineas(
      {
        encargadoTexto: "Texto encargado",
        encargadoRango: "Sgto.",
        encargadoNombre: "Wilson Lara",
        oficialTexto: "Texto oficial",
        oficialRango: "Tte. 2 (Apy)",
        oficialNombre: "Gerardo Otero",
      },
      2
    );

    expect(lineas.map((linea) => linea.indentLevel)).toEqual([2, 2, 2, 3, 3, 3]);
  });
});

describe("firma indent helpers", () => {
  it("separa la sangria base del offset inline", () => {
    const linea = {
      indentLevel: 2,
      inlineOffsetChars: 5,
    };

    expect(getFirmaLineBaseIndentCss(linea)).toBe("calc(2 * var(--firma-tab-size))");
    expect(getFirmaLineInlineOffsetCss(linea)).toBe("5ch");
  });

  it("calcula sangria base y offset inline en puntos para PDF", () => {
    const linea = {
      indentLevel: 3,
      inlineOffsetChars: 4,
    };

    expect(getFirmaLineBaseIndentPt(linea, 10)).toBe(30);
    expect(getFirmaLineInlineOffsetPt(linea, 2.5)).toBe(10);
  });
});
