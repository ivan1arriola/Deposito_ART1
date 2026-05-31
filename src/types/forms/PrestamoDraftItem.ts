import type { PrestamoEstadoEquipo } from "./PrestamoEstadoEquipo";

export type PrestamoDraftItem = {
  equipoId: string;
  cantidad: string;
  estadoEntrega: PrestamoEstadoEquipo;
  comentarioEntrega: string;
};
