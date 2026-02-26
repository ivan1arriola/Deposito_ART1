/**
 * Tipos relacionados con vistas y estado de la UI
 */

import type { Role } from "./entities";

export type MainView = "personal" | "hoja_matrix" | "tallas_resumen" | "grados" | "baterias" | "items" | "admin" | "ficha";

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

export type HojaMatrixItem = {
  itemId: string;
  nombre: string;
};

export type HojaMatrixRow = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  grado: string;
  totales: number[];
  totalGeneral: number;
};

export type HojaMatrixData = {
  generatedAt: string;
  items: HojaMatrixItem[];
  rows: HojaMatrixRow[];
};

export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: "danger" | "neutral";
  onConfirm: () => Promise<void> | void;
};
