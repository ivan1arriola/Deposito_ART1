import type { AuditoriaConfigCallbacks } from "./AuditoriaConfigCallbacks";
import type { AuditoriaConfigState } from "./AuditoriaConfigState";
import type { BateriaConfigCallbacks } from "./BateriaConfigCallbacks";
import type { BateriaConfigState } from "./BateriaConfigState";
import type { EquipoConfigCallbacks } from "./EquipoConfigCallbacks";
import type { EquipoConfigState } from "./EquipoConfigState";
import type { FirmaConfigCallbacks } from "./FirmaConfigCallbacks";
import type { FirmaConfigState } from "./FirmaConfigState";
import type { RangoConfigCallbacks } from "./RangoConfigCallbacks";
import type { RangoConfigState } from "./RangoConfigState";
import type { UsuarioConfigCallbacks } from "./UsuarioConfigCallbacks";
import type { UsuarioConfigState } from "./UsuarioConfigState";
import type { UtilityFunctions } from "./UtilityFunctions";

export interface ConfigViewsProps {
  activeView: "grados" | "baterias" | "equipos" | "tipos_equipo" | "firmas" | "usuarios" | "auditoria";
  isAdmin: boolean;
  canWrite: boolean;
  rango: RangoConfigState;
  rangCallbacks: RangoConfigCallbacks;
  bateria: BateriaConfigState;
  bateriaCallbacks: BateriaConfigCallbacks;
  equipos: EquipoConfigState;
  equipoCallbacks: EquipoConfigCallbacks;
  usuario: UsuarioConfigState;
  usuarioCallbacks: UsuarioConfigCallbacks;
  firmaConfig: FirmaConfigState;
  firmaConfigCallbacks: FirmaConfigCallbacks;
  auditoria: AuditoriaConfigState;
  auditoriaCallbacks: AuditoriaConfigCallbacks;
  utils: UtilityFunctions;
}
