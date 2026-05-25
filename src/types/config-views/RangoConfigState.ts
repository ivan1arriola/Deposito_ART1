import type { RangoConfig } from "./RangoConfig";

export interface RangoConfigState {
  rangos: RangoConfig[];
  newAbreviacion: string;
  newNombreCompleto: string;
  newOrden: string;
  editId: number | null;
  editAbreviacion: string;
  editNombreCompleto: string;
  editOrden: string;
}
