import type { RegistroTipo } from "../views/RegistroTipo";
import type { RegistroDraftEquipo } from "./RegistroDraftEquipo";

export type RegistroDestinatarioTipo = "PERSONAL" | "RECINTO" | "EXTERNO";
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
  destinatarioExternoGrado: string;
  destinatarioExternoNombre: string;
  destinatarioExternoApellido: string;
  destinatarioExternoCi: string;
  destinatarioExternoUnidadDestino: string;
  incluirFueraDeHoja: boolean;
  fecha: string;
  comentarios: string;
  items: RegistroDraftEquipo[];
};
