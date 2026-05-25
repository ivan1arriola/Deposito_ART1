import type { RegistroTipo } from "../views/RegistroTipo";
import type { PersonalAltaMovimientoItemForm } from "./PersonalAltaMovimientoItemForm";

export type PersonalAltaMovimientoForm = {
  tipo: RegistroTipo;
  fecha: string;
  comentarios: string;
  items: PersonalAltaMovimientoItemForm[];
};

export const EMPTY_PERSONAL_ALTA_MOVIMIENTO_FORM: PersonalAltaMovimientoForm = {
  tipo: "ENTREGA",
  fecha: "",
  comentarios: "",
  items: [{ itemId: "", cantidad: "1" }],
};
