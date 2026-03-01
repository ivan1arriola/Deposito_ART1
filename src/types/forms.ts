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

export type ItemForm = {
  nombre: string;
  activo: boolean;
  ordenPdf: number;
};

export type RegistroDraftItem = {
  itemId: string;
  cantidad: string;
};

export type RegistroDraft = {
  modo: "crear" | "rectificar";
  registroId: string | null;
  ci: string;
  tipo: RegistroTipo;
  fecha: string;
  comentarios: string;
  items: RegistroDraftItem[];
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

export const EMPTY_ITEM_FORM: ItemForm = {
  nombre: "",
  activo: true,
  ordenPdf: 1,
};
