import type { TipoEquipo } from "./TipoEquipo";

export type Equipo = {
  equipoId: string;
  /** @deprecated Usar `equipoId`. */
  itemId: string;
  nombre: string;
  tipo: TipoEquipo;
  activo: boolean;
  ordenPdf: number;
  existenciaSie?: number;
};
