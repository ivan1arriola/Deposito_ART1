import type { RegistroTipo } from "../views/RegistroTipo";
import type { RegistroDraftEquipo } from "./RegistroDraftEquipo";

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
