import { describe, expect, it } from "vitest";
import { TipoPersonal } from "@/generated/prisma/client";
import { buildSubalternoPersonalData } from "@/lib/personal-subalterno-data";

describe("buildSubalternoPersonalData", () => {
  it("preserva batería y fechas para reingresos", () => {
    const fechaIngreso = new Date("2026-05-20T00:00:00.000Z");
    const fechaIngresoOriginal = new Date("2024-03-01T00:00:00.000Z");

    expect(
      buildSubalternoPersonalData({
        telefonoContacto: "099123456",
        rangoId: 7,
        esReingreso: true,
        fechaIngreso,
        fechaIngresoOriginal,
        bateriaId: 3,
      })
    ).toEqual({
      telefonoContacto: "099123456",
      tipo: TipoPersonal.SUBALTERNO,
      rangoId: 7,
      esReingreso: true,
      fechaIngreso,
      fechaIngresoOriginal,
      bateriaId: 3,
    });
  });

  it("limpia fecha de ingreso original cuando no es reingreso", () => {
    const fechaIngreso = new Date("2026-05-20T00:00:00.000Z");
    const fechaIngresoOriginal = new Date("2024-03-01T00:00:00.000Z");

    expect(
      buildSubalternoPersonalData({
        telefonoContacto: null,
        rangoId: 4,
        esReingreso: false,
        fechaIngreso,
        fechaIngresoOriginal,
        bateriaId: null,
      })
    ).toEqual({
      telefonoContacto: null,
      tipo: TipoPersonal.SUBALTERNO,
      rangoId: 4,
      esReingreso: false,
      fechaIngreso,
      fechaIngresoOriginal: null,
      bateriaId: null,
    });
  });
});
