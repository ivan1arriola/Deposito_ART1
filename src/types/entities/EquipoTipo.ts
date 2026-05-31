import type { TipoEquipo } from "./TipoEquipo";

export type EquipoTipo = {
  tipoEquipoId: number | null;
  clave: TipoEquipo;
  nombre: string;
  orden: number;
  esGeneral: boolean;
};
