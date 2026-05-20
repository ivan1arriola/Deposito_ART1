"use client";

import { PersonalCreateView } from "@/app/components/views/PersonalCreateView";
import { OficialSuboficialCreateView } from "@/app/components/views/OficialSuboficialCreateView";
import { EquipoCreateView } from "@/app/components/views/EquipoCreateView";
import { ArticuloCreateView } from "@/app/components/views/ArticuloCreateView";
import { BateriaCreateView } from "@/app/components/views/BateriaCreateView";
import { RangoCreateView } from "@/app/components/views/RangoCreateView";
import { UserCreateView } from "@/app/components/views/UserCreateView";
import type { EquipoForm } from "@/types/forms";
import type { CreationViewsProps } from "./types";

export function CreationViews(props: CreationViewsProps) {
  const {
    activeView,
    ciPlaceholder,
    newPersonal,
    duplicatePersonal,
    ciHasError,
    ciLooksValid,
    ciAlreadyExists,
    canRegisterPersonal,
    requiredPersonalCompleted,
    requiredPersonalFields,
    canSubmitPersonal,
    creatingPersonal,
    rangos,
    baterias,
    equiposActivos,
    tallaOptionsByKey,
    maxFechaIngreso,
    newPersonalMovimientos,
    newPersonalMovimientoDraft,
    newPersonalMovimientoEditIndex,
    setActiveView,
    createPersonal,
    updateNewPersonalField,
    openNewPersonalMovimientoModal,
    closeNewPersonalMovimientoModal,
    saveNewPersonalMovimientoFromModal,
    editNewPersonalMovimiento,
    removeNewPersonalMovimiento,
    updateNewPersonalMovimientoDraft,
    updateNewPersonalMovimientoDraftItem,
    addNewPersonalMovimientoDraftItem,
    removeNewPersonalMovimientoDraftItem,
    editingOficialSuboficialCi,
    newOficialSuboficial,
    duplicateOficialSuboficialLabel,
    oficialSuboficialCiLooksValid,
    oficialSuboficialCiAlreadyExists,
    canRegisterOficialSuboficial,
    oficialSuboficialRequiredCompleted,
    oficialSuboficialRequiredFields,
    canSubmitOficialSuboficial,
    creatingOficialSuboficial,
    rangosOficialSuboficialDisponibles,
    cancelOficialSuboficialForm,
    createOficialSuboficial,
    updateNewOficialSuboficialField,
    newEquipo,
    loading,
    creatingEquipo,
    creatingArticulo,
    createEquipo,
    setNewEquipo,
    newArticuloNombre,
    newArticuloTipo,
    createArticulo,
    setNewArticuloNombre,
    setNewArticuloTipo,
    newBateria,
    newBateriaOrden,
    createBateria,
    setNewBateria,
    setNewBateriaOrden,
    newRangoAbreviacion,
    newRangoNombreCompleto,
    newRangoOrden,
    createRango,
    setNewRangoAbreviacion,
    setNewRangoNombreCompleto,
    setNewRangoOrden,
    isAdmin,
    newUserRangoId,
    rangosConfigView,
    newNombre,
    newApellido,
    newUsername,
    newPassword,
    newPasswordConfirm,
    newMailReferencia,
    newRole,
    createUsuario,
    setNewUserRangoId,
    setNewNombre,
    setNewApellido,
    setNewUsername,
    setNewPassword,
    setNewPasswordConfirm,
    setNewMailReferencia,
    setNewRole,
    roleLabel,
    roleDescription,
    roleScope,
  } = props;

  return (
    <>
      {activeView === "personal_nuevo" ? (
        <PersonalCreateView
          ciPlaceholder={ciPlaceholder}
          newPersonal={newPersonal}
          duplicatePersonal={duplicatePersonal}
          ciHasError={ciHasError}
          ciLooksValid={ciLooksValid}
          ciAlreadyExists={ciAlreadyExists}
          canRegisterPersonal={canRegisterPersonal}
          requiredPersonalCompleted={requiredPersonalCompleted}
          requiredPersonalFields={requiredPersonalFields}
          canSubmitPersonal={canSubmitPersonal}
          creatingPersonal={creatingPersonal}
          rangos={rangos}
          baterias={baterias}
          equiposActivos={equiposActivos}
          tallaOptionsByKey={tallaOptionsByKey}
          maxFechaIngreso={maxFechaIngreso}
          movimientos={newPersonalMovimientos}
          movimientoDraft={newPersonalMovimientoDraft}
          movimientoModalEditing={newPersonalMovimientoEditIndex !== null}
          onBack={() => setActiveView("personal")}
          onSubmit={(event) => void createPersonal(event)}
          onPersonalChange={updateNewPersonalField}
          onOpenMovimientoModal={openNewPersonalMovimientoModal}
          onCloseMovimientoModal={closeNewPersonalMovimientoModal}
          onSubmitMovimientoDraft={saveNewPersonalMovimientoFromModal}
          onEditMovimiento={editNewPersonalMovimiento}
          onRemoveMovimiento={removeNewPersonalMovimiento}
          onMovimientoDraftChange={updateNewPersonalMovimientoDraft}
          onMovimientoDraftItemChange={updateNewPersonalMovimientoDraftItem}
          onAddMovimientoDraftItem={addNewPersonalMovimientoDraftItem}
          onRemoveMovimientoDraftItem={removeNewPersonalMovimientoDraftItem}
        />
      ) : null}

      {activeView === "oficial_nuevo" || activeView === "suboficial_nuevo" ? (
        <OficialSuboficialCreateView
          mode={editingOficialSuboficialCi ? "edit" : "create"}
          ciPlaceholder={ciPlaceholder}
          form={newOficialSuboficial}
          duplicateLabel={duplicateOficialSuboficialLabel}
          ciHasError={!oficialSuboficialCiLooksValid || oficialSuboficialCiAlreadyExists}
          ciLooksValid={oficialSuboficialCiLooksValid}
          ciAlreadyExists={oficialSuboficialCiAlreadyExists}
          canRegister={canRegisterOficialSuboficial}
          requiredCompleted={oficialSuboficialRequiredCompleted}
          requiredFields={oficialSuboficialRequiredFields}
          canSubmit={canSubmitOficialSuboficial}
          saving={creatingOficialSuboficial}
          rangosDisponibles={rangosOficialSuboficialDisponibles}
          lockTipo
          disableCi={editingOficialSuboficialCi !== null}
          tallaOptionsByKey={tallaOptionsByKey}
          onBack={cancelOficialSuboficialForm}
          onSubmit={(event) => void createOficialSuboficial(event)}
          onChange={updateNewOficialSuboficialField}
        />
      ) : null}

      {activeView === "equipo_nuevo" ? (
        <EquipoCreateView
          form={newEquipo}
          saving={creatingEquipo}
          onBack={() => setActiveView("equipos")}
          onSubmit={(event) => void createEquipo(event)}
          onChange={(key, value) => {
            setNewEquipo((previous: EquipoForm) => ({
              ...previous,
              [key]: value,
            }));
          }}
        />
      ) : null}

      {activeView === "articulo_nuevo" ? (
        <ArticuloCreateView
          nombre={newArticuloNombre}
          tipo={newArticuloTipo}
          saving={creatingArticulo}
          onBack={() => setActiveView("articulos")}
          onCreate={() => void createArticulo()}
          onNombreChange={setNewArticuloNombre}
          onTipoChange={setNewArticuloTipo}
        />
      ) : null}

      {activeView === "bateria_nueva" ? (
        <BateriaCreateView
          nombre={newBateria}
          orden={newBateriaOrden}
          saving={loading}
          suggestedOrder={baterias.length + 1}
          onBack={() => setActiveView("personal")}
          onCreate={() => void createBateria()}
          onNombreChange={setNewBateria}
          onOrdenChange={setNewBateriaOrden}
        />
      ) : null}

      {activeView === "grado_nuevo" ? (
        <RangoCreateView
          abreviacion={newRangoAbreviacion}
          nombreCompleto={newRangoNombreCompleto}
          orden={newRangoOrden}
          saving={loading}
          suggestedOrder={rangos.length + 1}
          onBack={() => setActiveView("personal")}
          onCreate={() => void createRango()}
          onAbreviacionChange={setNewRangoAbreviacion}
          onNombreCompletoChange={setNewRangoNombreCompleto}
          onOrdenChange={setNewRangoOrden}
        />
      ) : null}

      {activeView === "usuario_nuevo" ? (
        <UserCreateView
          isAdmin={isAdmin}
          rangoId={newUserRangoId}
          rangoOptions={rangosConfigView}
          nombre={newNombre}
          apellido={newApellido}
          username={newUsername}
          password={newPassword}
          passwordConfirm={newPasswordConfirm}
          mailReferencia={newMailReferencia}
          role={newRole}
          onBack={() => setActiveView("usuarios")}
          onSubmit={(event) => void createUsuario(event)}
          onRangoIdChange={setNewUserRangoId}
          onNombreChange={setNewNombre}
          onApellidoChange={setNewApellido}
          onUsernameChange={setNewUsername}
          onPasswordChange={setNewPassword}
          onPasswordConfirmChange={setNewPasswordConfirm}
          onMailReferenciaChange={setNewMailReferencia}
          onRoleChange={setNewRole}
          roleLabel={roleLabel}
          roleDescription={roleDescription}
          roleScope={roleScope}
        />
      ) : null}
    </>
  );
}
