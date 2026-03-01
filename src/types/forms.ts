/**
 * Tipos de formularios y estados de edición
 */

import type { RegistroTipo } from "./views";

export type PersonalForm = {
  ci: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  fechaIngreso: string;
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
  codigos: EquipoCodigoForm[];
};

export type ItemForm = EquipoForm;

export type EquipoCodigoForm = {
  codigo: string;
  aclaracion: string;
};

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
  fecha: string;
  comentarios: string;
  items: RegistroDraftEquipo[];
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
  fechaIngreso: "",
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
  codigos: [],
};

export const EMPTY_ITEM_FORM: ItemForm = EMPTY_EQUIPO_FORM;
