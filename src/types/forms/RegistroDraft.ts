import type { RegistroTipo } from "../views/RegistroTipo";
import type { RegistroDraftEquipo } from "./RegistroDraftEquipo";

export type RegistroDestinatarioTipo = "PERSONAL" | "RECINTO";
export type RegistroRecintoClase = "INTERNO" | "EXTERNO";

export type RegistroDraft = {
  modo: "crear" | "rectificar";
  registroId: string | null;
  ci: string;
  ciList: string[];
  tipo: RegistroTipo;
  destinatarioTipo: RegistroDestinatarioTipo;
  recintoClase: RegistroRecintoClase;
  recintoNombre: string;
  incluirFueraDeHoja: boolean;
  fecha: string;
  comentarios: string;
  items: RegistroDraftEquipo[];
};
