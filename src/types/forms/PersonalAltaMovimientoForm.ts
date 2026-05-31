import type { RegistroTipo } from "../views/RegistroTipo";
import type { PersonalAltaMovimientoItemForm } from "./PersonalAltaMovimientoItemForm";

export type PersonalAltaMovimientoTipo = Exclude<RegistroTipo, "ASIGNACION">;

export type PersonalAltaMovimientoForm = {
  tipo: PersonalAltaMovimientoTipo;
  fecha: string;
  comentarios: string;
  equipos: PersonalAltaMovimientoItemForm[];
};

export const EMPTY_PERSONAL_ALTA_MOVIMIENTO_FORM: PersonalAltaMovimientoForm = {
  tipo: "ENTREGA",
  fecha: "",
  comentarios: "",
  equipos: [{ equipoId: "", cantidad: "1" }],
};
