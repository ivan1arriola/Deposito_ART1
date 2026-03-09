/**
 * Tipos relacionados con vistas y estado de la UI
 */

import type { Role } from "./entities";

export type MainView =
  | "personal"
  | "oficiales"
  | "suboficiales"
  | "personal_nuevo"
  | "oficial_nuevo"
  | "suboficial_nuevo"
  | "equipo_nuevo"
  | "bateria_nueva"
  | "grado_nuevo"
  | "usuario_nuevo"
  | "formularios"
  | "stock"
  | "stock_total"
  | "stock_actual"
  | "stock_alta"
  | "stock_baja"
  | "stock_historial"
  | "stock_prestamos"
  | "hoja_matrix"
  | "equipo_resumen"
  | "tallas_resumen"
  | "grados"
  | "baterias"
  | "equipos"
  | "firmas"
  | "usuarios"
  | "auditoria"
  | "hoja-de-entrega";

export type RegistroTipo = "ENTREGA" | "DEVOLUCION";

export type RegistroViewTipo = RegistroTipo | "AJUSTE";

export type AuditFilter = "TODOS" | "MOVIMIENTOS" | "AUTENTICACION";

export type RegistroView = {
  registroId: string;
  auditoria: {
    auditoriaId: string;
    createdAt: string;
    accion: string;
    usuarioId: string | null;
    usuario: { usuarioId: string; username: string; rol: Role } | null;
    detalle: unknown;
  } | null;
  ci: string;
  fecha: string;
  tipo: RegistroViewTipo;
  afectaStock: boolean;
  comentarios: string | null;
  createdAt: string;
  items: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
  }>;
};

export type RegistroViewerState = {
  ci: string;
  nombre: string;
  loading: boolean;
  error: string | null;
  registros: RegistroView[];
};

export type StockOperacionViewTipo = "INGRESO" | "EGRESO";
export type PrestamoHistorialTipo = "PRESTAMO" | "DEVOLUCION_PRESTAMO";

export type StockResumenRow = {
  itemId: string;
  nombre: string;
  ordenPdf: number;
  apareceEnHoja: boolean;
  stockSubalternos: number;
  stockPrestamo: number;
  stockDeposito: number;
  stockUnidad: number;
  // Alias legado para compatibilidad con pantallas existentes.
  stockPersonal: number;
  // Alias legado para compatibilidad con pantallas existentes.
  stockTotal: number;
  // Alias legado para compatibilidad con pantallas existentes.
  stockActual: number;
};

export type StockHistorialEntry = {
  id: string;
  fecha: string;
  createdAt: string;
  origen: "MANUAL" | "PERSONAL" | "PRESTAMO";
  tipo: StockOperacionViewTipo | RegistroTipo | PrestamoHistorialTipo;
  afectaStock: boolean;
  comentarios: string | null;
  totalUnidades: number;
  ci: string | null;
  persona: string | null;
  registradoPor: string | null;
  items: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    delta: number;
  }>;
};

export type PrestamoStockEntry = {
  prestamoId: string;
  reciboNumero: string;
  destinatarioTipo: "PERSONAL" | "OFICIAL" | "SUBOFICIAL";
  destinatarioCi: string;
  destinatarioNombre: string;
  destinatarioEtiqueta: string;
  usuarioEntregaId: string;
  usuarioEntregaNombre: string;
  fechaPrestamo: string;
  fechaEstimadaDevolucionTexto: string | null;
  fechaDevolucion: string | null;
  usuarioRecibeDevolucionId: string | null;
  usuarioRecibeDevolucionNombre: string | null;
  comentarios: string | null;
  estado: "PENDIENTE" | "DEVUELTO";
  items: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    estadoEntrega: "NUEVO" | "BUENO" | "REGULAR" | "MALO";
    comentarioEntrega: string | null;
    estadoDevolucion: "NUEVO" | "BUENO" | "REGULAR" | "MALO" | null;
    comentarioDevolucion: string | null;
  }>;
};

export type StockDashboardData = {
  generatedAt: string;
  resumen: StockResumenRow[];
  historial: StockHistorialEntry[];
  prestamos: PrestamoStockEntry[];
};

export type HojaMatrixEquipo = {
  itemId: string;
  nombre: string;
};

export type HojaMatrixItem = HojaMatrixEquipo;

export type HojaMatrixRow = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  bateriaOrden: number | null;
  grado: string;
  gradoOrden: number;
  gradoAbreviacion: string;
  totales: number[];
  totalGeneral: number;
};

export type HojaMatrixData = {
  generatedAt: string;
  items: HojaMatrixEquipo[];
  rows: HojaMatrixRow[];
};

export type EquipoResumenItem = {
  itemId: string;
  nombre: string;
};

export type EquipoResumenRow = {
  key: string;
  nombre: string;
  orden: number | null;
  totales: number[];
  totalGeneral: number;
};

export type EquipoResumenData = {
  generatedAt: string;
  items: EquipoResumenItem[];
  unidad: EquipoResumenRow;
  baterias: EquipoResumenRow[];
};

export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: "danger" | "neutral";
  onConfirm: () => Promise<void> | void;
};

