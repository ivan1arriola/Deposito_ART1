import { describe, expect, it } from "vitest";
import { validateAndNormalizeTallas } from "@/lib/tallas";

describe("validateAndNormalizeTallas", () => {
  it("acepta talles distintos por cada prenda", () => {
    const result = validateAndNormalizeTallas({
      PARKA: "M",
      CAMISACO: "XL",
      PANTALON: "S",
      KEPI: "58",
      CALZADO: "42",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.values).toEqual({
      PARKA: "M",
      CAMISACO: "XL",
      PANTALON: "S",
      KEPI: "58",
      CALZADO: "42",
    });
  });

  it("rechaza un kepi fuera de rango", () => {
    const result = validateAndNormalizeTallas({
      KEPI: "70",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("54 a 63");
  });

  it("rechaza una talla de ropa no permitida", () => {
    const result = validateAndNormalizeTallas({
      PARKA: "3XL",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("XS, S, M, L, XL, XXL, XXXL");
  });
});
