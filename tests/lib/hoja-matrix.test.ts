import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  equipo: {
    findMany: vi.fn(),
  },
  personal: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { TipoPersonal } from "@/generated/prisma/client";
import { getHojaMatrixData } from "@/lib/hoja-matrix";

describe("getHojaMatrixData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.equipo.findMany.mockResolvedValue([]);
    mockPrisma.personal.findMany.mockResolvedValue([]);
  });

  it("limita el personal a la batería seleccionada", async () => {
    await getHojaMatrixData({ bateria: "Batería A" });

    expect(mockPrisma.personal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          rango: { tipo: TipoPersonal.SUBALTERNO },
          bateria: { is: { nombre: "Batería A" } },
        },
      })
    );
  });

  it.each(["Sin batería", "Sin bateria"])("filtra correctamente la opción %s", async (bateria) => {
    await getHojaMatrixData({ bateria });

    expect(mockPrisma.personal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          rango: { tipo: TipoPersonal.SUBALTERNO },
          bateriaId: null,
        },
      })
    );
  });

  it("mantiene toda la unidad cuando no se selecciona una batería", async () => {
    await getHojaMatrixData();

    expect(mockPrisma.personal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          rango: { tipo: TipoPersonal.SUBALTERNO },
        },
      })
    );
  });
});
