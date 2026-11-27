import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERNAL_BENEFICIARY_ENTITIES,
  extractEntidadLabelFromUnidadDestino,
  mergeEntidadesBeneficiariasCatalog,
  normalizeEntidadBeneficiariaKey,
  parseEntidadBeneficiariaClase,
  sortEntidadesBeneficiariasEs,
} from "@/lib/entidades-beneficiarias";

describe("entidades-beneficiarias", () => {
  it("contiene exactamente las 34 entidades internas requeridas", () => {
    expect(DEFAULT_INTERNAL_BENEFICIARY_ENTITIES).toHaveLength(34);
    expect(DEFAULT_INTERNAL_BENEFICIARY_ENTITIES).toContain("Batería Comando");
    expect(DEFAULT_INTERNAL_BENEFICIARY_ENTITIES).toContain("Depósito de UTH");
  });

  it("normaliza claves sin tildes ni espacios extra y parsea clases válidas", () => {
    expect(normalizeEntidadBeneficiariaKey("  Administración   Central ")).toBe(
      "administracion central"
    );
    expect(parseEntidadBeneficiariaClase("interno")).toBe("INTERNO");
    expect(parseEntidadBeneficiariaClase("EXTERNO")).toBe("EXTERNO");
    expect(parseEntidadBeneficiariaClase("OTRO")).toBeNull();
  });

  it("extrae etiquetas históricas de unidadDestino distinguiendo clase", () => {
    expect(extractEntidadLabelFromUnidadDestino("")).toBeNull();
    expect(extractEntidadLabelFromUnidadDestino("-")).toBeNull();
    expect(extractEntidadLabelFromUnidadDestino("Interno a la Unidad - S1")).toEqual({
      clase: "INTERNO",
      nombre: "S1",
    });
    expect(
      extractEntidadLabelFromUnidadDestino("Externo a la Unidad - Brigada de Artillería")
    ).toEqual({
      clase: "EXTERNO",
      nombre: "Brigada de Artillería",
    });
    expect(extractEntidadLabelFromUnidadDestino("Escuela Militar")).toEqual({
      clase: "EXTERNO",
      nombre: "Escuela Militar",
    });
  });

  it("combina catálogo BD, 34 entidades base e históricas evitando duplicados por clase y ordena en español", () => {
    const merged = mergeEntidadesBeneficiariasCatalog(
      [
        {
          entidadBeneficiariaId: 1,
          clase: "INTERNO",
          nombre: "Enfermería",
          activo: false,
        },
        {
          entidadBeneficiariaId: 2,
          clase: "EXTERNO",
          nombre: "Águila Sur",
          activo: true,
        },
      ],
      [
        { clase: "INTERNO", nombre: "Batería A" },
        { clase: "INTERNO", nombre: "  " },
        { clase: "EXTERNO", nombre: "Comando General" },
      ]
    );

    const enfermeria = merged.find((e) => e.clase === "INTERNO" && e.nombre === "Enfermería");
    expect(enfermeria?.activo).toBe(false);
    expect(enfermeria?.entidadBeneficiariaId).toBe(1);

    const bateriaAMatches = merged.filter((e) => e.clase === "INTERNO" && e.nombre === "Batería A");
    expect(bateriaAMatches).toHaveLength(1);

    const sortedNames = sortEntidadesBeneficiariasEs([
      { nombre: "Zapatería" },
      { nombre: "Águila" },
      { nombre: "Batería" },
    ]).map((i) => i.nombre);
    expect(sortedNames).toEqual(["Águila", "Batería", "Zapatería"]);
  });
});
