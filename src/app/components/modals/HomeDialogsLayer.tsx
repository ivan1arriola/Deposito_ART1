"use client";

import { apellidosLabel, nombresLabel, roleDescription, roleLabel, roleScope } from "@/lib/formatters";
import type { Equipo, Personal, PersonalObservacion, Role } from "@/types/entities";
import type { RegistroDraft, RegistroDraftEquipo } from "@/types/forms";
import type { ConfirmDialogState, RegistroView, RegistroViewerState } from "@/types/views";
import type { PersonalObservacionDraft, UserPasswordDialogState, UserProfileDialogState, UserRoleDialogState } from "@/app/types/home";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { ConfirmDialogModal } from "./ConfirmDialog";
import { PersonalObservacionModal } from "./PersonalObservacionModal";
import { RegistroEditorModal } from "./RegistroEditorModal";
import { RegistroViewerModal } from "./RegistroViewerModal";
import { UserPasswordModal } from "./UserPasswordModal";
import { UserRoleModal } from "./UserRoleModal";
import { UsernameModal } from "./UsernameModal";

type HomeDialogsLayerProps = {
  showChangePassword: boolean;
  changeCurrentPassword: string;
  changeNewPassword: string;
  changeConfirmPassword: string;
  changeLoading: boolean;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onCloseChangePassword: () => void;
  onSubmitChangePassword: () => void;
  userRoleDialog: UserRoleDialogState | null;
  userRoleSaving: boolean;
  onUserRoleChange: (role: Role) => void;
  onCloseUserRole: () => void;
  onSubmitUserRole: () => void;
  userPasswordDialog: UserPasswordDialogState | null;
  userPasswordSaving: boolean;
  onUserPasswordChange: (field: "newPassword" | "confirmPassword", value: string) => void;
  onCloseUserPassword: () => void;
  onSubmitUserPassword: () => void;
  usernameDialog: UserProfileDialogState | null;
  usernameSaving: boolean;
  onUsernameDialogChange: (
    field: keyof Pick<UserProfileDialogState, "grado" | "nombre" | "apellido" | "username" | "mailReferencia">,
    value: string,
  ) => void;
  onCloseUsernameDialog: () => void;
  onSubmitUsernameDialog: () => void;
  confirmDialog: ConfirmDialogState | null;
  confirmDialogBusy: boolean;
  onCloseConfirmDialog: () => void;
  onConfirmDialogAccept: () => void;
  registroViewer: RegistroViewerState | null;
  registroViewerRowsPaginados: RegistroView[];
  registroViewerPage: number;
  registroViewerPageSize: number;
  canWrite: boolean;
  canDelete: boolean;
  onRectifyRegistro: (registro: RegistroView) => void;
  onDeleteRegistro: (registro: RegistroView) => void;
  onRegistroViewerPageChange: (page: number) => void;
  onRegistroViewerPageSizeChange: (pageSize: number) => void;
  onCloseRegistroViewer: () => void;
  registroDraft: RegistroDraft | null;
  personaRegistro: Personal | null;
  personalFiltrado: Personal[];
  equiposOrdenados: Equipo[];
  maxFechaIngreso: string;
  registroSaving: boolean;
  onCloseRegistroEditor: () => void;
  onAfectaStockChange: (value: boolean) => void;
  onRegistroDraftChange: (field: "fecha" | "comentarios", value: string) => void;
  onToggleRegistroDestinatario: (ci: string) => void;
  onSelectAllRegistroDestinatarios: () => void;
  onClearRegistroDestinatarios: () => void;
  onRegistroItemChange: (index: number, field: keyof RegistroDraftEquipo, value: string) => void;
  onAddRegistroItem: () => void;
  onRemoveRegistroItem: (index: number) => void;
  onSubmitRegistro: () => void;
  personalObservacionDraft: PersonalObservacionDraft | null;
  personalObservacionSaving: boolean;
  onClosePersonalObservacion: () => void;
  onResetPersonalObservacion: () => void;
  onEditPersonalObservacion: (observacion: PersonalObservacion) => void;
  onDeletePersonalObservacion: (observacion: PersonalObservacion) => void;
  onPersonalObservacionDateChange: (value: string) => void;
  onPersonalObservacionTextChange: (value: string) => void;
  onSubmitPersonalObservacion: () => void;
};

export function HomeDialogsLayer({
  showChangePassword,
  changeCurrentPassword,
  changeNewPassword,
  changeConfirmPassword,
  changeLoading,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onCloseChangePassword,
  onSubmitChangePassword,
  userRoleDialog,
  userRoleSaving,
  onUserRoleChange,
  onCloseUserRole,
  onSubmitUserRole,
  userPasswordDialog,
  userPasswordSaving,
  onUserPasswordChange,
  onCloseUserPassword,
  onSubmitUserPassword,
  usernameDialog,
  usernameSaving,
  onUsernameDialogChange,
  onCloseUsernameDialog,
  onSubmitUsernameDialog,
  confirmDialog,
  confirmDialogBusy,
  onCloseConfirmDialog,
  onConfirmDialogAccept,
  registroViewer,
  registroViewerRowsPaginados,
  registroViewerPage,
  registroViewerPageSize,
  canWrite,
  canDelete,
  onRectifyRegistro,
  onDeleteRegistro,
  onRegistroViewerPageChange,
  onRegistroViewerPageSizeChange,
  onCloseRegistroViewer,
  registroDraft,
  personaRegistro,
  personalFiltrado,
  equiposOrdenados,
  maxFechaIngreso,
  registroSaving,
  onCloseRegistroEditor,
  onAfectaStockChange,
  onRegistroDraftChange,
  onToggleRegistroDestinatario,
  onSelectAllRegistroDestinatarios,
  onClearRegistroDestinatarios,
  onRegistroItemChange,
  onAddRegistroItem,
  onRemoveRegistroItem,
  onSubmitRegistro,
  personalObservacionDraft,
  personalObservacionSaving,
  onClosePersonalObservacion,
  onResetPersonalObservacion,
  onEditPersonalObservacion,
  onDeletePersonalObservacion,
  onPersonalObservacionDateChange,
  onPersonalObservacionTextChange,
  onSubmitPersonalObservacion,
}: HomeDialogsLayerProps) {
  return (
    <>
      <ChangePasswordModal
        isOpen={showChangePassword}
        currentPassword={changeCurrentPassword}
        newPassword={changeNewPassword}
        confirmPassword={changeConfirmPassword}
        loading={changeLoading}
        onCurrentPasswordChange={onChangeCurrentPassword}
        onNewPasswordChange={onChangeNewPassword}
        onConfirmPasswordChange={onChangeConfirmPassword}
        onClose={onCloseChangePassword}
        onSubmit={onSubmitChangePassword}
      />

      <UserRoleModal
        dialog={userRoleDialog}
        saving={userRoleSaving}
        roleLabel={roleLabel}
        roleDescription={roleDescription}
        roleScope={roleScope}
        onRoleChange={onUserRoleChange}
        onClose={onCloseUserRole}
        onSubmit={onSubmitUserRole}
      />

      <UserPasswordModal
        dialog={userPasswordDialog}
        saving={userPasswordSaving}
        onNewPasswordChange={(value) => onUserPasswordChange("newPassword", value)}
        onConfirmPasswordChange={(value) => onUserPasswordChange("confirmPassword", value)}
        onClose={onCloseUserPassword}
        onSubmit={onSubmitUserPassword}
      />

      <UsernameModal
        dialog={usernameDialog}
        saving={usernameSaving}
        onChange={onUsernameDialogChange}
        onClose={onCloseUsernameDialog}
        onSubmit={onSubmitUsernameDialog}
      />

      <ConfirmDialogModal dialog={confirmDialog} busy={confirmDialogBusy} onClose={onCloseConfirmDialog} onConfirm={onConfirmDialogAccept} />

      <RegistroViewerModal
        viewer={registroViewer}
        rows={registroViewerRowsPaginados}
        canWrite={canWrite}
        page={registroViewerPage}
        pageSize={registroViewerPageSize}
        totalItems={registroViewer?.registros.length ?? 0}
        roleLabel={roleLabel}
        onRectify={onRectifyRegistro}
        canDelete={canDelete}
        onDelete={onDeleteRegistro}
        onPageChange={onRegistroViewerPageChange}
        onPageSizeChange={onRegistroViewerPageSizeChange}
        onClose={onCloseRegistroViewer}
      />

      <RegistroEditorModal
        draft={registroDraft}
        personaLabel={personaRegistro ? `${apellidosLabel(personaRegistro)}, ${nombresLabel(personaRegistro)}` : null}
        personalFiltrado={personalFiltrado}
        equiposOrdenados={equiposOrdenados}
        maxFechaIngreso={maxFechaIngreso}
        saving={registroSaving}
        onClose={onCloseRegistroEditor}
        onAfectaStockChange={onAfectaStockChange}
        onDateChange={(value) => onRegistroDraftChange("fecha", value)}
        onComentariosChange={(value) => onRegistroDraftChange("comentarios", value)}
        onToggleDestinatario={onToggleRegistroDestinatario}
        onSelectAllDestinatarios={onSelectAllRegistroDestinatarios}
        onClearDestinatarios={onClearRegistroDestinatarios}
        onItemChange={onRegistroItemChange}
        onAddItem={onAddRegistroItem}
        onRemoveItem={onRemoveRegistroItem}
        onSubmit={onSubmitRegistro}
      />

      <PersonalObservacionModal
        draft={personalObservacionDraft}
        saving={personalObservacionSaving}
        maxFechaIngreso={maxFechaIngreso}
        onClose={onClosePersonalObservacion}
        onReset={onResetPersonalObservacion}
        onEdit={onEditPersonalObservacion}
        onDelete={onDeletePersonalObservacion}
        onDateChange={onPersonalObservacionDateChange}
        onTextChange={onPersonalObservacionTextChange}
        onSubmit={onSubmitPersonalObservacion}
      />
    </>
  );
}
