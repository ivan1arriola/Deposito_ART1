/**
 * Shim legado: reexporta los tipos centrales para evitar duplicaciones.
 */

export type {
  AccountType,
  AuditoriaRecord,
  Bateria,
  CurrentUser,
  DbStatus,
  Equipo,
  FirmaConfig,
  Personal,
  Rango,
  Role,
  Talla,
  TipoEquipo,
  UsuarioAdmin,
} from "@/types/entities";

export type {
  EquipoForm,
  PersonalForm,
  RegistroDraft,
  RegistroDraftEquipo,
} from "@/types/forms";

export type {
  AuditFilter,
  ConfirmDialogState,
  HojaMatrixData,
  HojaMatrixEquipo,
  HojaMatrixRow,
  MainView,
  RegistroTipo,
  RegistroView,
  RegistroViewTipo,
  RegistroViewerState,
} from "@/types/views";
