import type { PrestamoEstadoEquipo } from "./PrestamoEstadoEquipo";

export type PrestamoDraftItem = {
  itemId: string;
  cantidad: string;
  estadoEntrega: PrestamoEstadoEquipo;
  comentarioEntrega: string;
};
