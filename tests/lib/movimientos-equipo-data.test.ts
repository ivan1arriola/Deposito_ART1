import { beforeEach, describe, expect, it, vi } from "vitest";

const compatibilityState = vi.hoisted(() => ({
  applied: false,
}));

const mockEnsureMovimientoDestinatarioRecintoCompatibility = vi.hoisted(() =>
  vi.fn(async () => {
    compatibilityState.applied = true;
  }),
);

const mockPrisma = vi.hoisted(() => ({
  equipo: {
    findMany: vi.fn(),
  },
  movimientoEquipo: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/movimiento-destinatario-recinto-compat", () => ({
  ensureMovimientoDestinatarioRecintoCompatibility: mockEnsureMovimientoDestinatarioRecintoCompatibility,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { TipoMovimiento } from "@/generated/prisma/client";
import { getMovimientosEquipoData } from "@/lib/movimientos-equipo-data";

describe("getMovimientosEquipoData", () => {
  beforeEach(() => {
    compatibilityState.applied = false;
    vi.clearAllMocks();

    mockPrisma.equipo.findMany.mockResolvedValue([
      { equipoId: BigInt(113), nombre: "Notebook tactica", activo: true },
      { equipoId: BigInt(114), nombre: "Radio", activo: true },
    ]);

    mockPrisma.movimientoEquipo.findMany.mockImplementation(async () => {
      if (!compatibilityState.applied) {
        throw Object.assign(
          new Error("The table `public.movimiento_destinatario_recinto` does not exist in the current database."),
          { code: "P2021" },
        );
      }

      return [
        {
          cantidad: 1,
          movimiento: {
            movimientoId: BigInt(900),
            fecha: new Date("2026-05-20T00:00:00.000Z"),
            tipo: TipoMovimiento.ENTREGA,
            observaciones: "Entrega temporal a taller",
            destinatarioPersonal: null,
            destinatarioExterno: null,
            destinatarioRecinto: {
              clase: "EXTERNO",
              nombre: "Taller central",
            },
            prestamoActivo: null,
            prestamoHistorial: null,
          },
        },
      ];
    });
  });

  it("asegura la compatibilidad del destinatario recinto antes de consultar movimientos", async () => {
    const data = await getMovimientosEquipoData(BigInt(113));

    expect(mockEnsureMovimientoDestinatarioRecintoCompatibility).toHaveBeenCalledTimes(1);
    expect(mockPrisma.movimientoEquipo.findMany).toHaveBeenCalledTimes(1);
    expect(mockEnsureMovimientoDestinatarioRecintoCompatibility.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrisma.movimientoEquipo.findMany.mock.invocationCallOrder[0],
    );

    expect(data.selectedItem).toEqual({
      equipoId: "113",
      equipoId: "113",
      nombre: "Notebook tactica",
      activo: true,
    });
    expect(data.rows).toEqual([
      expect.objectContaining({
        movimientoId: "900",
        tipo: "ENTREGA",
        tipoLabel: "Entrega",
        persona: "Taller central",
        gradoAbreviacion: "RECINTO",
        ci: "",
      }),
    ]);
  });
});
