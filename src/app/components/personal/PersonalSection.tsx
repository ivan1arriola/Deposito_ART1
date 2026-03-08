"use client";

import { LoadingInline, PaginationControls } from "@/app/components/shared";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import type { TallaKey } from "@/lib/tallas";
import type { Bateria, Personal, Rango } from "@/types/entities";
import type { PersonalForm } from "@/types/forms";
import { PersonalCardsMobile } from "./PersonalCardsMobile";
import { PersonalFilters } from "./PersonalFilters";
import { PersonalInlineEditForm } from "./PersonalInlineEditForm";
import { PersonalTableDesktop } from "./PersonalTableDesktop";

type PersonalSectionProps = {
  loading: boolean;
  personal: Personal[];
  personalFiltrado: Personal[];
  personalFiltradoPaginado: Personal[];
  baterias: Bateria[];
  rangos: Rango[];
  canWrite: boolean;
  searchCedula: string;
  searchApellidos: string;
  searchNombres: string;
  bateriaFilter: string;
  hasPersonalFilters: boolean;
  personalPage: number;
  personalPageSize: number;
  expandedTallasByCi: Record<string, boolean>;
  editPersonalCi: string | null;
  editPersonal: PersonalForm;
  tallaOptionsByKey: Record<TallaKey, string[]>;
  maxFechaIngreso: string;
  onSearchCedulaChange: (value: string) => void;
  onSearchApellidosChange: (value: string) => void;
  onSearchNombresChange: (value: string) => void;
  onBateriaFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onPersonalPageChange: (page: number) => void;
  onPersonalPageSizeChange: (pageSize: number) => void;
  onPrintAllDeliverySheets: () => void;
  onPrintPersonnelByBattery: () => void;
  onOpenMassEntrega: () => void;
  onOpenCreate: () => void;
  onToggleTallas: (ci: string) => void;
  onDeletePersonal: (ci: string) => void;
  onOpenRegistro: (ci: string, tipo: "ENTREGA" | "DEVOLUCION") => void;
  onOpenPersonalObservacion: (persona: Personal) => void;
  onOpenRegistroViewer: (persona: Personal) => void;
  onOpenDeliverySheet: (ci: string) => void;
  onStartEditPersonal: (persona: Personal) => void;
  onCancelEditPersonal: () => void;
  onEditPersonalChange: (field: keyof PersonalForm, value: string | boolean) => void;
  onSaveEditPersonal: (ci: string) => void;
};

export function PersonalSection({
  loading,
  personal,
  personalFiltrado,
  personalFiltradoPaginado,
  baterias,
  rangos,
  canWrite,
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
  onSearchCedulaChange,
  onSearchApellidosChange,
  onSearchNombresChange,
  onBateriaFilterChange,
  onClearFilters,
  onPersonalPageChange,
  onPersonalPageSizeChange,
  onPrintAllDeliverySheets,
  onPrintPersonnelByBattery,
  onOpenMassEntrega,
  onOpenCreate,
  onToggleTallas,
  onDeletePersonal,
  onOpenRegistro,
  onOpenPersonalObservacion,
  onOpenRegistroViewer,
  onOpenDeliverySheet,
  onStartEditPersonal,
  onCancelEditPersonal,
  onEditPersonalChange,
  onSaveEditPersonal,
}: PersonalSectionProps) {
  const handleToggleEdit = (persona: Personal) => {
    if (editPersonalCi === persona.ci) {
      onCancelEditPersonal();
      return;
    }
    onStartEditPersonal(persona);
  };

  const editingPersona = editPersonalCi ? personal.find((persona) => persona.ci === editPersonalCi) ?? null : null;

  const actionGridClass = canWrite
    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-3";

  return (
    <section className="mt-6 space-y-4">
      <section className="ej-card rounded-2xl p-3 sm:p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-stone-900">Personal</h2>
          <p className="mt-1 text-xs text-stone-600">Orden: Grado del Personal, Apellidos y Nombres.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
              {personalFiltrado.length} resultado{personalFiltrado.length === 1 ? "" : "s"}
            </div>
            {loading ? (
              <LoadingInline
                label="Actualizando datos..."
                size="xs"
                textClassName="text-xs font-semibold text-stone-600"
              />
            ) : null}
          </div>
        </div>
        <div className={`mt-4 grid w-full gap-2 ${actionGridClass}`}>
          {canWrite ? (
            <button
              type="button"
              onClick={onOpenMassEntrega}
              disabled={loading || personalFiltrado.length === 0}
              className="h-11 w-full rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Entrega masiva
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrintAllDeliverySheets}
            disabled={loading || personal.length === 0}
            className="h-11 w-full rounded-xl bg-indigo-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir todas las hojas
          </button>
          <button
            type="button"
            onClick={onPrintPersonnelByBattery}
            disabled={loading || personal.length === 0}
            className="h-11 w-full rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir lista por bateria
          </button>
          <button
            type="button"
            onClick={onOpenCreate}
            disabled={!canWrite}
            className="ej-button h-11 w-full rounded-xl px-3 text-sm font-semibold disabled:opacity-50"
          >
            Registrar nuevo
          </button>
        </div>
      </section>

      <PersonalFilters
        searchCedula={searchCedula}
        searchApellidos={searchApellidos}
        searchNombres={searchNombres}
        bateriaFilter={bateriaFilter}
        baterias={baterias}
        hasFilters={hasPersonalFilters}
        onSearchCedulaChange={onSearchCedulaChange}
        onSearchApellidosChange={onSearchApellidosChange}
        onSearchNombresChange={onSearchNombresChange}
        onBateriaFilterChange={onBateriaFilterChange}
        onClear={onClearFilters}
      />

      <section className="rounded-2xl border border-stone-200 bg-white/90 p-3 sm:p-4">
        <PaginationControls
          page={personalPage}
          pageSize={personalPageSize}
          totalItems={personalFiltrado.length}
          itemLabel="personas"
          onPageChange={onPersonalPageChange}
          onPageSizeChange={onPersonalPageSizeChange}
          className="hidden md:flex"
        />

        <PersonalCardsMobile
          personas={personalFiltradoPaginado}
          canWrite={canWrite}
          expandedTallasByCi={expandedTallasByCi}
          editPersonalCi={editPersonalCi}
          onToggleEdit={handleToggleEdit}
          onDelete={onDeletePersonal}
          onToggleTallas={onToggleTallas}
          onEntrega={(ci) => onOpenRegistro(ci, "ENTREGA")}
          onDevolucion={(ci) => onOpenRegistro(ci, "DEVOLUCION")}
          onObservacion={onOpenPersonalObservacion}
          onViewMoves={onOpenRegistroViewer}
          onOpenSheet={onOpenDeliverySheet}
        />

        <div className="mt-3 md:hidden">
          <PaginationControls
            page={personalPage}
            pageSize={personalPageSize}
            totalItems={personalFiltrado.length}
            itemLabel="personas"
            onPageChange={onPersonalPageChange}
            onPageSizeChange={onPersonalPageSizeChange}
            className="mt-1"
          />
        </div>

        <PersonalTableDesktop
          personas={personalFiltradoPaginado}
          canWrite={canWrite}
          expandedTallasByCi={expandedTallasByCi}
          editPersonalCi={editPersonalCi}
          onToggleEdit={handleToggleEdit}
          onDelete={onDeletePersonal}
          onToggleTallas={onToggleTallas}
          onEntrega={(ci) => onOpenRegistro(ci, "ENTREGA")}
          onDevolucion={(ci) => onOpenRegistro(ci, "DEVOLUCION")}
          onObservacion={onOpenPersonalObservacion}
          onViewMoves={onOpenRegistroViewer}
          onOpenSheet={onOpenDeliverySheet}
        />

        <PaginationControls
          page={personalPage}
          pageSize={personalPageSize}
          totalItems={personalFiltrado.length}
          itemLabel="personas"
          onPageChange={onPersonalPageChange}
          onPageSizeChange={onPersonalPageSizeChange}
          className="mt-4 hidden md:flex"
        />
      </section>

      {editPersonalCi ? (
        <ModalFrame onClose={onCancelEditPersonal} size="xl" closeOnBackdrop={false}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Editar personal</h3>
              <p className="mt-1 text-sm text-stone-600">
                {editingPersona ? `${editingPersona.rango.nombreCompleto} - ${editingPersona.apellido1} ${editingPersona.nombre1}` : `CI ${editPersonalCi}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelEditPersonal}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-4">
            <PersonalInlineEditForm
              editPersonal={editPersonal}
              rangos={rangos}
              baterias={baterias}
              tallaOptionsByKey={tallaOptionsByKey}
              maxFechaIngreso={maxFechaIngreso}
              onChange={onEditPersonalChange}
              onSave={() => onSaveEditPersonal(editPersonalCi)}
            />
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}
