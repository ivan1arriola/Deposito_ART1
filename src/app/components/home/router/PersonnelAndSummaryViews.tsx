"use client";

import { PersonalSection } from "@/app/components/personal/PersonalSection";
import { OficialesSuboficialesView } from "@/app/components/views/OficialesSuboficialesView";
import { OficialesSuboficialesResumenView } from "@/app/components/views/OficialesSuboficialesResumenView";
import { HojaMatrixView } from "@/app/components/views/HojaMatrixView";
import { EquipoResumenView } from "@/app/components/views/EquipoResumenView";
import { MovimientosFueraHojaView } from "@/app/components/views/MovimientosFueraHojaView";
import { TallasResumenView } from "@/app/components/views/TallasResumenView";
import { PersonalBajasView } from "@/app/components/views/PersonalBajasView";
import type { PersonalForm } from "@/types/forms";
import type { PersonnelAndSummaryViewsProps } from "./types";

export function PersonnelAndSummaryViews(props: PersonnelAndSummaryViewsProps) {
  const {
    activeView,
    loading,
    personal,
    personalFiltrado,
    personalFiltradoPaginado,
    baterias,
    rangos,
    canWrite,
    isAdmin,
    searchCedula,
    searchApellidos,
    searchNombres,
    bateriaFilter,
    hasPersonalFilters,
    personalPage,
    personalPageSize,
    expandedTallasByCi,
    editPersonalCi,
    editPersonal,
    tallaOptionsByKey,
    maxFechaIngreso,
    setSearchCedula,
    setSearchApellidos,
    setSearchNombres,
    setBateriaFilter,
    setPersonalPage,
    setPersonalPageSize,
    printAllDeliverySheets,
    emailAllDeliverySheets,
    cancelBulkDeliveryEmailJob,
    bulkDeliveryEmailBusy,
    bulkDeliveryEmailDisabledReason,
    printPersonnelByBattery,
    openMassRegistro,
    setActiveView,
    toggleTallas,
    deletePersonal,
    openRegistro,
    openPersonalObservacion,
    openRegistroViewer,
    openPersonaProfileFromPersonal,
    setFichaViewingCi,
    startEditPersonal,
    setEditPersonalCi,
    setEditPersonal,
    EMPTY_PERSONAL_FORM,
    updatePersonal,
    canPromoteEditPersonalToSuboficial,
    promotingSubalternoCi,
    promoteSargentoToSuboficial,
    openAscensoDeliverySheet,
    oficialesSuboficiales,
    startEditOficialSuboficial,
    openOficialSuboficialCreate,
    openPersonaProfileFromOficialSuboficial,
    reloadCurrentViewData,
    hojaMatrixData,
    hojaMatrixLoading,
    hojaMatrixError,
    loadHojaMatrix,
    equipoResumenData,
    equipoResumenLoading,
    equipoResumenError,
    loadEquipoResumen,
  } = props;

  const isTallasResumenView =
    activeView === "tallas_resumen" ||
    activeView === "tallas_resumen_subalternos_unidad" ||
    activeView === "tallas_resumen_subalternos_bateria" ||
    activeView === "tallas_resumen_oficiales_suboficiales";

  const tallasResumenSubView =
    activeView === "tallas_resumen_subalternos_unidad"
      ? "subalternos_unidad"
      : activeView === "tallas_resumen_subalternos_bateria"
        ? "subalternos_bateria"
        : activeView === "tallas_resumen_oficiales_suboficiales"
          ? "oficiales_suboficiales"
          : "general";

  return (
    <>
      {activeView === "personal" ? (
        <PersonalSection
          loading={loading}
          personal={personal}
          personalFiltrado={personalFiltrado}
          personalFiltradoPaginado={personalFiltradoPaginado}
          baterias={baterias}
          rangos={rangos}
          canWrite={canWrite}
          isAdmin={isAdmin}
          searchCedula={searchCedula}
          searchApellidos={searchApellidos}
          searchNombres={searchNombres}
          bateriaFilter={bateriaFilter}
          hasPersonalFilters={hasPersonalFilters}
          personalPage={personalPage}
          personalPageSize={personalPageSize}
          expandedTallasByCi={expandedTallasByCi}
          editPersonalCi={editPersonalCi}
          editPersonal={editPersonal}
          tallaOptionsByKey={tallaOptionsByKey}
          maxFechaIngreso={maxFechaIngreso}
          onSearchCedulaChange={setSearchCedula}
          onSearchApellidosChange={setSearchApellidos}
          onSearchNombresChange={setSearchNombres}
          onBateriaFilterChange={setBateriaFilter}
          onClearFilters={() => {
            setSearchCedula("");
            setSearchNombres("");
            setSearchApellidos("");
            setBateriaFilter("ALL");
          }}
          onPersonalPageChange={setPersonalPage}
          onPersonalPageSizeChange={setPersonalPageSize}
          onPrintAllDeliverySheets={printAllDeliverySheets}
          onEmailAllDeliverySheets={emailAllDeliverySheets}
          onCancelEmailAllDeliverySheets={cancelBulkDeliveryEmailJob}
          emailAllDeliverySheetsBusy={bulkDeliveryEmailBusy}
          emailAllDeliverySheetsDisabledReason={bulkDeliveryEmailDisabledReason}
          onPrintPersonnelByBattery={printPersonnelByBattery}
          onOpenMassEntrega={() => openMassRegistro("ENTREGA")}
          onOpenCreate={() => setActiveView("personal_nuevo")}
          onToggleTallas={toggleTallas}
          onDeletePersonal={(ci) => void deletePersonal(ci)}
          onOpenRegistro={(ci, tipo) => openRegistro(ci, tipo)}
          onOpenPersonalObservacion={(persona) => void openPersonalObservacion(persona)}
          onOpenRegistroViewer={(persona) => void openRegistroViewer(persona)}
          onOpenProfile={(persona) => void openPersonaProfileFromPersonal(persona)}
          onOpenDeliverySheet={(ci) => {
            setActiveView("hoja-de-entrega");
            setFichaViewingCi(ci);
          }}
          onStartEditPersonal={startEditPersonal}
          onCancelEditPersonal={() => {
            setEditPersonalCi(null);
            setEditPersonal(() => EMPTY_PERSONAL_FORM);
          }}
          onEditPersonalChange={(field, value) =>
            setEditPersonal((prev: PersonalForm) => {
              const next = { ...prev, [field]: value };
              if (field === "esReingreso" && value === false) {
                next.fechaIngresoOriginal = "";
              }
              return next;
            })}
          onSaveEditPersonal={(ci) => void updatePersonal(ci)}
          canPromoteEditPersonalToSuboficial={canPromoteEditPersonalToSuboficial}
          promoteEditPersonalBusy={promotingSubalternoCi !== null}
          onPromoteEditPersonalToSuboficial={(ci, adminPassword) =>
            void promoteSargentoToSuboficial(ci, adminPassword)
          }
          onPrintAscensoDeliverySheet={openAscensoDeliverySheet}
        />
      ) : null}

      {activeView === "oficiales" ? (
        <OficialesSuboficialesView
          oficialesSuboficiales={oficialesSuboficiales}
          loading={loading}
          canWrite={canWrite}
          viewType="OFICIAL"
          onOpenCreate={() => openOficialSuboficialCreate("OFICIAL")}
          onStartEdit={startEditOficialSuboficial}
          onOpenProfile={(registro) => void openPersonaProfileFromOficialSuboficial(registro)}
          onReload={() => reloadCurrentViewData(true)}
        />
      ) : null}

      {activeView === "suboficiales" ? (
        <OficialesSuboficialesView
          oficialesSuboficiales={oficialesSuboficiales}
          loading={loading}
          canWrite={canWrite}
          viewType="SUBOFICIAL"
          onOpenCreate={() => openOficialSuboficialCreate("SUBOFICIAL")}
          onStartEdit={startEditOficialSuboficial}
          onOpenProfile={(registro) => void openPersonaProfileFromOficialSuboficial(registro)}
          onReload={() => reloadCurrentViewData(true)}
        />
      ) : null}

      {activeView === "oficiales_resumen" ? (
        <OficialesSuboficialesResumenView
          oficialesSuboficiales={oficialesSuboficiales}
          viewType="OFICIAL"
          loading={loading}
          onReload={() => reloadCurrentViewData(true)}
        />
      ) : null}

      {activeView === "suboficiales_resumen" ? (
        <OficialesSuboficialesResumenView
          oficialesSuboficiales={oficialesSuboficiales}
          viewType="SUBOFICIAL"
          loading={loading}
          onReload={() => reloadCurrentViewData(true)}
        />
      ) : null}

      {activeView === "hoja_matrix" ? (
        <HojaMatrixView data={hojaMatrixData} loading={hojaMatrixLoading} error={hojaMatrixError} onReload={loadHojaMatrix} />
      ) : null}

      {activeView === "equipo_resumen" ? (
        <EquipoResumenView data={equipoResumenData} loading={equipoResumenLoading} error={equipoResumenError} onReload={loadEquipoResumen} />
      ) : null}

      {activeView === "movimientos_fuera_hoja" ? (
        <MovimientosFueraHojaView canWrite={canWrite} onOpenRegistro={openRegistro} />
      ) : null}

      {isTallasResumenView ? (
        <TallasResumenView
          personal={personal}
          baterias={baterias}
          oficialesSuboficiales={oficialesSuboficiales}
          subView={tallasResumenSubView}
        />
      ) : null}

      {activeView === "personal_bajas" ? (
        <PersonalBajasView />
      ) : null}
    </>
  );
}
