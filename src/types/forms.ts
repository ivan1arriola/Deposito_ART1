/**
 * Tipos de formularios y estados de edicion
 */

import type { RegistroTipo } from "./views";
import type { TipoOficialSuboficial } from "./entities";

export type StockOperacionTipo = "INGRESO" | "EGRESO";
export type PrestamoDestinatarioTipo = "PERSONAL" | "OFICIAL" | "SUBOFICIAL";
export type PrestamoEstadoEquipo = "NUEVO" | "BUENO" | "REGULAR" | "MALO";

export type PersonalForm = {
  ci: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  telefonoContacto: string;
  esReingreso: boolean;
  fechaIngreso: string;
  fechaIngresoOriginal: string;
  rangoId: string;
  bateriaId: string;
  PARKA: string;
  CAMISACO: string;
  PANTALON: string;
  KEPI: string;
  CALZADO: string;
};

export type OficialSuboficialForm = {
  ci: string;
  tipo: TipoOficialSuboficial;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  telefonoContacto: string;
  rangoId: string;
  PARKA: string;
  CAMISACO: string;
  PANTALON: string;
  KEPI: string;
  CALZADO: string;
};

export type PersonalAltaMovimientoItemForm = {
  itemId: string;
  cantidad: string;
};

export type PersonalAltaMovimientoForm = {
  tipo: RegistroTipo;
  fecha: string;
  comentarios: string;
  items: PersonalAltaMovimientoItemForm[];
};

export type EquipoForm = {
  nombre: string;
  activo: boolean;
  ordenPdf: number;
};

export type ItemForm = EquipoForm;

export type RegistroDraftEquipo = {
  itemId: string;
  cantidad: string;
};

export type RegistroDraftItem = RegistroDraftEquipo;

export type RegistroDraft = {
  modo: "crear" | "rectificar";
  registroId: string | null;
  ci: string;
  ciList: string[];
  tipo: RegistroTipo;
  incluirFueraDeHoja: boolean;
  fecha: string;
  comentarios: string;
  items: RegistroDraftEquipo[];
};

export type StockOperacionDraftItem = {
  itemId: string;
  cantidad: string;
};

export type StockOperacionDraft = {
  tipo: StockOperacionTipo;
  fecha: string;
  comentarios: string;
  items: StockOperacionDraftItem[];
};

export type PrestamoDraftItem = {
  itemId: string;
  cantidad: string;
  estadoEntrega: PrestamoEstadoEquipo;
  comentarioEntrega: string;
};

export type PrestamoDraft = {
  destinatarioTipo: PrestamoDestinatarioTipo;
  destinatarioCi: string;
  actuanteCi: string;
  fechaPrestamo: string;
  fechaEstimadaDevolucionTexto: string;
  comentarios: string;
  items: PrestamoDraftItem[];
};

/**
 * Constantes de formularios vacios
 */
export const EMPTY_PERSONAL_FORM: PersonalForm = {
  ci: "",
  apellido1: "",
  apellido2: "",
  nombre1: "",
  nombre2: "",
  telefonoContacto: "",
  esReingreso: false,
  fechaIngreso: "",
  fechaIngresoOriginal: "",
  rangoId: "",
  bateriaId: "",
  PARKA: "",
  CAMISACO: "",
  PANTALON: "",
  KEPI: "",
  CALZADO: "",
};

export const EMPTY_OFICIAL_SUBOFICIAL_FORM: OficialSuboficialForm = {
  ci: "",
  tipo: "OFICIAL",
  apellido1: "",
  apellido2: "",
  nombre1: "",
  nombre2: "",
  telefonoContacto: "",
  rangoId: "",
  PARKA: "",
  CAMISACO: "",
  PANTALON: "",
  KEPI: "",
  CALZADO: "",
};

export const EMPTY_EQUIPO_FORM: EquipoForm = {
  nombre: "",
  activo: false,
  ordenPdf: 1,
};

export const EMPTY_ITEM_FORM: ItemForm = EMPTY_EQUIPO_FORM;

export const EMPTY_STOCK_OPERACION_DRAFT: StockOperacionDraft = {
  tipo: "INGRESO",
  fecha: "",
  comentarios: "",
  items: [{ itemId: "", cantidad: "1" }],
};

export const EMPTY_PRESTAMO_DRAFT: PrestamoDraft = {
  destinatarioTipo: "PERSONAL",
  destinatarioCi: "",
  actuanteCi: "",
  fechaPrestamo: "",
  fechaEstimadaDevolucionTexto: "",
  comentarios: "",
  items: [{ itemId: "", cantidad: "1", estadoEntrega: "NUEVO", comentarioEntrega: "" }],
};

export const EMPTY_PERSONAL_ALTA_MOVIMIENTO_FORM: PersonalAltaMovimientoForm = {
  tipo: "ENTREGA",
  fecha: "",
  comentarios: "",
  items: [{ itemId: "", cantidad: "1" }],
};
