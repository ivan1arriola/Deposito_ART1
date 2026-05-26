import type { Dispatch, SetStateAction } from "react";
import type { PersonalObservacionDraft, UserPasswordDialogState, UserProfileDialogState, UserRoleDialogState } from "@/app/types/home";
import type {
  CurrentUser,
  Equipo,
  Personal,
  PersonalObservacion,
  Rango,
  RecordatorioConfig,
  RecordatorioTarea,
  SoldadoWidgetVariant,
} from "@/types/entities";
import type { RegistroDraft, RegistroDraftEquipo } from "@/types/forms";
import type { ConfirmDialogState, MainView, RegistroView, RegistroViewerState } from "@/types/views";
import type { PersonaProfileState } from "@/app/components/views/PersonaProfileView";

export type HomeOverlaysLayerProps = {
  activeView: MainView;
  mergeEquipoDialog: { sourceItemId: string; targetItemId: string } | null;
  mergeEquipoSource: Equipo | null;
  mergeEquipoDialogTargetId: string;
  mergeEquipoTargetOptions: Equipo[];
  mergeEquipoSaving: boolean;
  updateMergeEquipoDialogTarget: (targetItemId: string) => void;
  closeMergeEquipoDialog: () => void;
  submitMergeEquipoDialog: () => Promise<void>;
  showChangePassword: boolean;
  changeCurrentPassword: string;
  changeNewPassword: string;
  changeConfirmPassword: string;
  changeLoading: boolean;
  setChangeCurrentPassword: Dispatch<SetStateAction<string>>;
  setChangeNewPassword: Dispatch<SetStateAction<string>>;
  setChangeConfirmPassword: Dispatch<SetStateAction<string>>;
  setShowChangePassword: Dispatch<SetStateAction<boolean>>;
  submitChangePassword: () => Promise<void>;
  userRoleDialog: UserRoleDialogState | null;
  userRoleSaving: boolean;
  setUserRoleDialog: Dispatch<SetStateAction<UserRoleDialogState | null>>;
  closeUserRoleDialog: () => void;
  submitUserRoleChange: () => Promise<void>;
  userPasswordDialog: UserPasswordDialogState | null;
  userPasswordSaving: boolean;
  setUserPasswordDialog: Dispatch<SetStateAction<UserPasswordDialogState | null>>;
  closeUserPasswordDialog: () => void;
  submitUserPasswordChange: () => Promise<void>;
  usernameDialog: UserProfileDialogState | null;
  usernameSaving: boolean;
  rangosConfigView: Rango[];
  setUsernameDialog: Dispatch<SetStateAction<UserProfileDialogState | null>>;
  closeUsernameDialog: () => void;
  submitUsernameChange: () => Promise<void>;
  confirmDialog: ConfirmDialogState | null;
  confirmDialogBusy: boolean;
  closeConfirmDialog: () => void;
  confirmDialogAccept: () => Promise<void>;
  registroViewer: RegistroViewerState | null;
  registroViewerRowsPaginados: RegistroView[];
  registroViewerPage: number;
  registroViewerPageSize: number;
  canWrite: boolean;
  canDeleteRegistros: boolean;
  rectifyRegistro: (registro: RegistroView) => void;
  setRegistroViewerPage: Dispatch<SetStateAction<number>>;
  setRegistroViewerPageSize: Dispatch<SetStateAction<number>>;
  setRegistroViewer: Dispatch<SetStateAction<RegistroViewerState | null>>;
  registroDraft: RegistroDraft | null;
  personaRegistro: Personal | null;
  personalFiltrado: Personal[];
  equiposOrdenados: Equipo[];
  maxFechaIngreso: string;
  registroSaving: boolean;
  setRegistroDraft: Dispatch<SetStateAction<RegistroDraft | null>>;
  toggleRegistroDestinatario: (ci: string) => void;
  selectAllRegistroDestinatarios: () => void;
  clearRegistroDestinatarios: () => void;
  updateRegistroItem: (index: number, field: keyof RegistroDraftEquipo, value: string) => void;
  addRegistroItem: () => void;
  removeRegistroItem: (index: number) => void;
  deleteRegistro: (registro: RegistroView) => void;
  saveRegistro: (printAfterSave?: boolean) => Promise<void>;
  personalObservacionDraft: PersonalObservacionDraft | null;
  personalObservacionSaving: boolean;
  setPersonalObservacionDraft: Dispatch<SetStateAction<PersonalObservacionDraft | null>>;
  resetPersonalObservacionForm: () => void;
  editPersonalObservacion: (observacion: PersonalObservacion) => void;
  deletePersonalObservacion: (observacion: PersonalObservacion) => void;
  savePersonalObservacion: () => Promise<void>;
  personaProfile: PersonaProfileState | null;
  closePersonaProfileView: () => void;
  reloadPersonaProfile: () => Promise<void>;
  printDeliverySheetFromProfile: (ci: string) => void;
  printPrestamosFromProfile: (prestamoIds: string[]) => void;
  onPrintMovementsSummary: (ci: string) => void;
  fichaViewingCi: string | null;
  setActiveView: Dispatch<SetStateAction<MainView>>;
  recordatorioConfig: RecordatorioConfig;
  recordatorioTasks: RecordatorioTarea[];
  recordatoriosLoading: boolean;
  recordatoriosSaving: boolean;
  currentUser: CurrentUser;
  soldadoWidgetVariant: SoldadoWidgetVariant;
  createRecordatorioTask: (input: {
    titulo: string;
    nota: string;
    fechaLimite: string | null;
    prioridad: "NORMAL" | "URGENTE";
    usuarioId?: string;
  }) => Promise<void>;
  updateRecordatorioTask: (
    tareaId: string,
    input: Partial<{ titulo: string; nota: string; fechaLimite: string | null; prioridad: "NORMAL" | "URGENTE" }> & { completada?: boolean },
  ) => Promise<void>;
  isAppGlobalBusy: boolean;
  appBusyLabel: string;
};
