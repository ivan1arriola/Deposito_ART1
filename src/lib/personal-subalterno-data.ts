import { TipoPersonal } from "@/generated/prisma/client";

type BuildSubalternoPersonalDataInput = {
  telefonoContacto?: string | null;
  rangoId: number;
  esReingreso?: boolean | null;
  fechaIngreso?: Date | null;
  fechaIngresoOriginal?: Date | null;
  bateriaId?: number | null;
};

export function buildSubalternoPersonalData(input: BuildSubalternoPersonalDataInput) {
  const esReingreso = input.esReingreso === true;

  return {
    telefonoContacto: input.telefonoContacto ?? null,
    tipo: TipoPersonal.SUBALTERNO,
    rangoId: input.rangoId,
    esReingreso,
    fechaIngreso: input.fechaIngreso ?? null,
    fechaIngresoOriginal: esReingreso ? (input.fechaIngresoOriginal ?? null) : null,
    bateriaId: input.bateriaId ?? null,
  };
}
