import type { TipoEquipo } from "../entities/TipoEquipo";
import type { EquipoConfig } from "./EquipoConfig";

export interface EquipoConfigState {
  equipos: EquipoConfig[];
  newEquipo: { nombre: string; tipo: TipoEquipo; activo: boolean; ordenPdf: number };
  editEquipoId: string | null;
  editEquipo: { nombre: string; tipo: TipoEquipo; activo: boolean; ordenPdf: number };
  equiposActivos: EquipoConfig[];
  equiposInactivos: EquipoConfig[];
  equiposActivosEnPantalla: EquipoConfig[];
  hasEquipoOrderDraftChanges: boolean;
}
