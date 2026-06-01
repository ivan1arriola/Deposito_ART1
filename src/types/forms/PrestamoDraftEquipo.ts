import type { PrestamoEstadoEquipo } from "./PrestamoEstadoEquipo";

export type PrestamoDraftEquipo = {
  equipoId: string;
  cantidad: string;
  estadoEntrega: PrestamoEstadoEquipo;
  comentarioEntrega: string;
};
