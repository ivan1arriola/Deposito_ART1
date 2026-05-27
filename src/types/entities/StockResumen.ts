import type { TipoEquipo } from "./TipoEquipo";

export type StockResumen = {
  equipoId: string;
  /** @deprecated Usar `equipoId`. */
  itemId: string;
  nombre: string;
  tipo: TipoEquipo;
  ordenPdf: number;
  apareceEnHoja: boolean;
  existenciaSie: number;
  stockSubalternos: number;
  stockAsignacion: number;
  stockPrestamo: number;
  stockDeposito: number;
  stockUnidad: number;
  stockPersonal: number;
  stockTotal: number;
  stockActual: number;
};
