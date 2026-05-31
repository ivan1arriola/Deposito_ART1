import type { TipoEquipo } from "./TipoEquipo";

export type Equipo = {
  equipoId: string;
  /** @deprecated Usar `equipoId`. */
  itemId: string;
  nombre: string;
  tipo: TipoEquipo;
  tipoEquipoId?: number | null;
  tipoLabel?: string;
  tipoOrden?: number;
  activo: boolean;
  ordenPdf: number;
  existenciaSie?: number;
};
