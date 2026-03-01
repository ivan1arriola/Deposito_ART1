/**
 * Tipos de formularios y estados de edición
 */

import type { RegistroTipo } from "./views";

export type StockOperacionTipo = "INGRESO" | "EGRESO";

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
  tipo: RegistroTipo;
  afectaStock: boolean;
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

/**
 * Constantes de formularios vacíos
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

export const EMPTY_EQUIPO_FORM: EquipoForm = {
  nombre: "",
  activo: true,
  ordenPdf: 1,
};

export const EMPTY_ITEM_FORM: ItemForm = EMPTY_EQUIPO_FORM;

export const EMPTY_STOCK_OPERACION_DRAFT: StockOperacionDraft = {
  tipo: "INGRESO",
  fecha: "",
  comentarios: "",
  items: [{ itemId: "", cantidad: "1" }],
};
