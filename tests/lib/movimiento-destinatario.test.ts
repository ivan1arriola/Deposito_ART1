import { describe, expect, it } from "vitest";

import { normalizeRecintoClase, resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";

describe("movimiento-destinatario", () => {
  it("normaliza la clase del recinto", () => {
    expect(normalizeRecintoClase("externo")).toBe("EXTERNO");
    expect(normalizeRecintoClase("interno")).toBe("INTERNO");
    expect(normalizeRecintoClase("")).toBe("INTERNO");
  });

  it("resume destinatarios de recinto sin CI", () => {
    const destinatario = resolveDestinatarioMovimiento({
      destinatarioRecinto: {
        clase: "EXTERNO",
        nombre: "Ministerio de Defensa",
      },
    });

    expect(destinatario).not.toBeNull();
    expect(destinatario?.tipo).toBe("RECINTO");
    expect(destinatario?.clase).toBe("EXTERNO");
    expect(destinatario?.ci).toBe("");
    expect(destinatario?.perfilCi).toBeNull();
    expect(destinatario?.etiqueta).toBe("Ministerio de Defensa");
  });
});
