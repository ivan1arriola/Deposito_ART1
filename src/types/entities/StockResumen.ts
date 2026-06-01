import type { TipoEquipo } from "./TipoEquipo";

export type StockResumen = {
  equipoId: string;
  nombre: string;
  tipo: TipoEquipo;
  tipoEquipoId?: number | null;
  tipoLabel?: string;
  tipoOrden?: number;
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
