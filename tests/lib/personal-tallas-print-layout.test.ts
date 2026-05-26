import { describe, expect, it } from "vitest";

import { buildDynamicTallaColumnWidths } from "@/lib/personal-tallas-print-layout";

function toNumber(value: string) {
  return Number.parseFloat(value.replace("%", ""));
}

describe("buildDynamicTallaColumnWidths", () => {
  it("distribuye mas ancho a los titulos largos de talla", () => {
    const widths = buildDynamicTallaColumnWidths(41, []);

    expect(toNumber(widths.CAMISACO)).toBeGreaterThan(toNumber(widths.PARKA));
    expect(toNumber(widths.PANTALON)).toBeGreaterThan(toNumber(widths.KEPI));
    expect(toNumber(widths.CALZADO)).toBeGreaterThan(toNumber(widths.KEPI));
  });

  it("respeta el ancho total disponible", () => {
    const widths = buildDynamicTallaColumnWidths(38, [
      {
        PARKA: "XL",
        CAMISACO: "M",
        PANTALON: "S",
        KEPI: "56",
        CALZADO: "41",
      },
      {
        PARKA: "-",
        CAMISACO: "Sin dato",
        PANTALON: "L",
        KEPI: "57",
        CALZADO: "40",
      },
    ]);

    const total = Object.values(widths).reduce((sum, width) => sum + toNumber(width), 0);
    expect(total).toBeCloseTo(38, 2);
  });
});
