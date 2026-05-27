"use client";

import { renderSoldadoRecordatorioWidget } from "@/app/components/home/SoldadoRecordatorioWidgetStrategyImpl";
import { HomeDialogsLayer } from "@/app/components/modals/HomeDialogsLayer";
import { MergeEquipoModal } from "@/app/components/modals/MergeEquipoModal";
import { HojaDeEntregaView } from "@/app/components/views/HojaDeEntregaView";
import { PersonaProfileView } from "@/app/components/views/PersonaProfileView";
import { LoadingOverlay } from "@/app/components/shared";
import type { Role } from "@/types/entities";
import type { HomeOverlaysLayerProps } from "./types";

export function HomeOverlaysLayer(props: HomeOverlaysLayerProps) {
  const {
    activeView,
    mergeEquipoDialog,
    mergeEquipoSource,
    mergeEquipoDialogTargetId,
    mergeEquipoTargetOptions,
    mergeEquipoSaving,
    updateMergeEquipoDialogTarget,
    closeMergeEquipoDialog,
    submitMergeEquipoDialog,
    showChangePassword,
    changeCurrentPassword,
    changeNewPassword,
    changeConfirmPassword,
    changeLoading,
    setChangeCurrentPassword,
    setChangeNewPassword,
    setChangeConfirmPassword,
    setShowChangePassword,
    submitChangePassword,
    userRoleDialog,
    userRoleSaving,
    setUserRoleDialog,
    closeUserRoleDialog,
    submitUserRoleChange,
    userPasswordDialog,
    userPasswordSaving,
    setUserPasswordDialog,
    closeUserPasswordDialog,
    submitUserPasswordChange,
    usernameDialog,
    usernameSaving,
    rangosConfigView,
    setUsernameDialog,
    closeUsernameDialog,
    submitUsernameChange,
    confirmDialog,
    confirmDialogBusy,
    closeConfirmDialog,
    confirmDialogAccept,
    registroViewer,
    registroViewerRowsPaginados,
    registroViewerPage,
    registroViewerPageSize,
    canWrite,
    canDeleteRegistros,
    rectifyRegistro,
    setRegistroViewerPage,
    setRegistroViewerPageSize,
    setRegistroViewer,
    registroDraft,
    personaRegistro,
    personalFiltrado,
    oficialesSuboficiales,
    equiposOrdenados,
    maxFechaIngreso,
    registroSaving,
    setRegistroDraft,
    toggleRegistroDestinatario,
    selectAllRegistroDestinatarios,
    clearRegistroDestinatarios,
    updateRegistroItem,
    addRegistroItem,
    removeRegistroItem,
    deleteRegistro,
    saveRegistro,
    personalObservacionDraft,
    personalObservacionSaving,
    setPersonalObservacionDraft,
    resetPersonalObservacionForm,
    editPersonalObservacion,
    deletePersonalObservacion,
    savePersonalObservacion,
    personaProfile,
    closePersonaProfileView,
    reloadPersonaProfile,
    printDeliverySheetFromProfile,
    printPrestamosFromProfile,
    onPrintMovementsSummary,
    fichaViewingCi,
    setActiveView,
    recordatorioConfig,
    recordatorioTasks,
    recordatoriosLoading,
    recordatoriosSaving,
    currentUser,
    soldadoWidgetVariant,
    createRecordatorioTask,
    updateRecordatorioTask,
    isAppGlobalBusy,
    appBusyLabel,
  } = props;

  return (
    <>
      <MergeEquipoModal
        isOpen={mergeEquipoDialog !== null}
        sourceName={mergeEquipoSource?.nombre ?? ""}
        targetItemId={mergeEquipoDialogTargetId}
        targetOptions={mergeEquipoTargetOptions.map((equipo: { itemId: string; nombre: string }) => ({ itemId: equipo.itemId, nombre: equipo.nombre }))}
        saving={mergeEquipoSaving}
        onTargetChange={updateMergeEquipoDialogTarget}
        onClose={closeMergeEquipoDialog}
        onSubmit={() => void submitMergeEquipoDialog()}
      />

      <HomeDialogsLayer
        showChangePassword={showChangePassword}
        changeCurrentPassword={changeCurrentPassword}
        changeNewPassword={changeNewPassword}
        changeConfirmPassword={changeConfirmPassword}
        changeLoading={changeLoading}
        onChangeCurrentPassword={setChangeCurrentPassword}
        onChangeNewPassword={setChangeNewPassword}
        onChangeConfirmPassword={setChangeConfirmPassword}
        onCloseChangePassword={() => setShowChangePassword(false)}
        onSubmitChangePassword={() => void submitChangePassword()}
        userRoleDialog={userRoleDialog}
        userRoleSaving={userRoleSaving}
        onUserRoleChange={(role: Role) =>
          setUserRoleDialog((current) => (current ? { ...current, nextRole: role } : current))
        }
        onCloseUserRole={closeUserRoleDialog}
        onSubmitUserRole={() => void submitUserRoleChange()}
        userPasswordDialog={userPasswordDialog}
        userPasswordSaving={userPasswordSaving}
        onUserPasswordChange={(field: "newPassword" | "confirmPassword", value: string) =>
          setUserPasswordDialog((current) => (current ? { ...current, [field]: value } : current))
        }
        onCloseUserPassword={closeUserPasswordDialog}
        onSubmitUserPassword={() => void submitUserPasswordChange()}
        usernameDialog={usernameDialog}
        usernameSaving={usernameSaving}
        userRangoOptions={rangosConfigView}
        onUsernameDialogChange={(field: "rangoId" | "nombre" | "apellido" | "username" | "mailReferencia", value: string) =>
          setUsernameDialog((current) => (current ? { ...current, [field]: value } : current))
        }
        onCloseUsernameDialog={closeUsernameDialog}
        onSubmitUsernameDialog={() => void submitUsernameChange()}
        confirmDialog={confirmDialog}
        confirmDialogBusy={confirmDialogBusy}
        onCloseConfirmDialog={closeConfirmDialog}
        onConfirmDialogAccept={() => void confirmDialogAccept()}
        registroViewer={registroViewer}
        registroViewerRowsPaginados={registroViewerRowsPaginados}
        registroViewerPage={registroViewerPage}
        registroViewerPageSize={registroViewerPageSize}
        canWrite={canWrite}
        canDelete={canDeleteRegistros}
        onRectifyRegistro={rectifyRegistro}
        onRegistroViewerPageChange={setRegistroViewerPage}
        onRegistroViewerPageSizeChange={setRegistroViewerPageSize}
        onCloseRegistroViewer={() => setRegistroViewer(null)}
        registroDraft={registroDraft}
        personaRegistro={personaRegistro}
        personalFiltrado={personalFiltrado}
        oficialesSuboficiales={oficialesSuboficiales}
        equiposOrdenados={equiposOrdenados}
        maxFechaIngreso={maxFechaIngreso}
        registroSaving={registroSaving}
        onCloseRegistroEditor={() => setRegistroDraft(null)}
        onRegistroDraftChange={(
          field:
            | "fecha"
            | "comentarios"
            | "destinatarioTipo"
            | "recintoClase"
            | "recintoNombre"
            | "recintoResponsableGrado"
            | "recintoResponsableNombre"
            | "recintoResponsableApellido"
            | "recintoResponsableCi"
            | "destinatarioExternoGrado"
            | "destinatarioExternoNombre"
            | "destinatarioExternoApellido"
            | "destinatarioExternoCi"
            | "destinatarioExternoUnidadDestino",
          value: string,
        ) =>
          setRegistroDraft((prev) => {
            if (!prev) return prev;
            if (field === "destinatarioTipo") {
              const nextTipo = value as "PERSONAL" | "RECINTO" | "EXTERNO";
              return {
                ...prev,
                destinatarioTipo: nextTipo,
                ciList: nextTipo === "PERSONAL" ? prev.ciList : [],
                ci: nextTipo === "PERSONAL" ? prev.ci : "",
                recintoNombre: nextTipo === "RECINTO" ? prev.recintoNombre : "",
                destinatarioExternoGrado: nextTipo === "EXTERNO" ? prev.destinatarioExternoGrado : "",
                destinatarioExternoNombre: nextTipo === "EXTERNO" ? prev.destinatarioExternoNombre : "",
                destinatarioExternoApellido: nextTipo === "EXTERNO" ? prev.destinatarioExternoApellido : "",
                destinatarioExternoCi: nextTipo === "EXTERNO" ? prev.destinatarioExternoCi : "",
                destinatarioExternoUnidadDestino: nextTipo === "EXTERNO" ? prev.destinatarioExternoUnidadDestino : "",
              };
            }
            return { ...prev, [field]: value };
          })
        }
        onToggleRegistroIncluirFueraDeHoja={() =>
          setRegistroDraft((prev) => (prev ? { ...prev, incluirFueraDeHoja: !prev.incluirFueraDeHoja } : prev))
        }
        onToggleRegistroDestinatario={toggleRegistroDestinatario}
        onSelectAllRegistroDestinatarios={selectAllRegistroDestinatarios}
        onClearRegistroDestinatarios={clearRegistroDestinatarios}
        onRegistroItemChange={updateRegistroItem}
        onAddRegistroItem={addRegistroItem}
        onRemoveRegistroItem={removeRegistroItem}
        onDeleteRegistro={deleteRegistro}
        onSubmitRegistro={() => void saveRegistro()}
        onSubmitRegistroAndPrint={() => void saveRegistro(true)}
        personalObservacionDraft={personalObservacionDraft}
        personalObservacionSaving={personalObservacionSaving}
        onClosePersonalObservacion={() => setPersonalObservacionDraft(null)}
        onResetPersonalObservacion={resetPersonalObservacionForm}
        onEditPersonalObservacion={editPersonalObservacion}
        onDeletePersonalObservacion={deletePersonalObservacion}
        onPersonalObservacionDateChange={(value: string) =>
          setPersonalObservacionDraft((prev) => (prev ? { ...prev, fecha: value } : prev))
        }
        onPersonalObservacionTextChange={(value: string) =>
          setPersonalObservacionDraft((prev) => (prev ? { ...prev, texto: value } : prev))
        }
        onSubmitPersonalObservacion={() => void savePersonalObservacion()}
      />

      {activeView === "persona_ficha" ? (
        <PersonaProfileView
          state={personaProfile}
          onBack={closePersonaProfileView}
          onReload={() => void reloadPersonaProfile()}
          onPrintDeliverySheet={printDeliverySheetFromProfile}
          onPrintPrestamos={printPrestamosFromProfile}
          onPrintMovementsSummary={onPrintMovementsSummary}
        />
      ) : null}

      {activeView === "hoja-de-entrega" && fichaViewingCi ? (
        <HojaDeEntregaView ci={fichaViewingCi} onClose={() => setActiveView("personal")} />
      ) : null}

      {renderSoldadoRecordatorioWidget({
        activeView,
        config: recordatorioConfig,
        tasks: recordatorioTasks,
        loading: recordatoriosLoading,
        saving: recordatoriosSaving,
        displayName: (currentUser.nombre || currentUser.username).trim(),
        soldadoVariant: soldadoWidgetVariant,
        onCreateTask: createRecordatorioTask,
        onToggleTask: (tareaId: string, completada: boolean) => updateRecordatorioTask(tareaId, { completada }),
        onOpenConfig: () => setActiveView("recordatorios"),
      })}

      <LoadingOverlay visible={isAppGlobalBusy} label={appBusyLabel} />
    </>
  );
}
