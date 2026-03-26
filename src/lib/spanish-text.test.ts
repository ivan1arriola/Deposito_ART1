import { describe, expect, it } from "vitest";
import { normalizeOutputText, normalizeSearchText, stripDiacritics } from "@/lib/spanish-text";

describe("spanish-text", () => {
  it("preserva tildes y Ñ en texto de salida", () => {
    expect(normalizeOutputText("Año, acción, pingüino, Ñandú")).toBe("Año, acción, pingüino, Ñandú");
  });

  it("normaliza NBSP en texto de salida", () => {
    expect(normalizeOutputText("Hola\u00a0mundo")).toBe("Hola mundo");
  });

  it("normaliza términos de búsqueda de forma insensible a acento", () => {
    expect(normalizeSearchText("  Sargénto 1º  ")).toBe("sargento 1º");
  });

  it("elimina diacríticos sin alterar otras letras", () => {
    expect(stripDiacritics("ÁÉÍÓÚ áéíóú Ññ Üü")).toBe("AEIOU aeiou Nn Uu");
  });
});
