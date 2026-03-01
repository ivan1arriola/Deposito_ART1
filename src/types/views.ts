/**
 * Tipos relacionados con vistas y estado de la UI
 */

import type { Role } from "./entities";

export type MainView =
  | "personal"
  | "personal_nuevo"
  | "formularios"
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
