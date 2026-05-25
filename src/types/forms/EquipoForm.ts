import type { TipoEquipo } from "../entities/TipoEquipo";

export type EquipoForm = {
  nombre: string;
  tipo: TipoEquipo;
  activo: boolean;
  ordenPdf: number;
};

export const EMPTY_EQUIPO_FORM: EquipoForm = {
  nombre: "",
  tipo: "GENERAL",
  activo: false,
  ordenPdf: 1,
};
