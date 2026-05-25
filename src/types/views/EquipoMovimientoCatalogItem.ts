export type EquipoMovimientoCatalogItem = {
  equipoId: string;
  /** @deprecated Usar `equipoId`. */
  itemId: string;
  nombre: string;
  activo: boolean;
};
