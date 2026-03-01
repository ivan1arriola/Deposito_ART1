"use client";

import { PaginationControls } from "@/app/components/shared";
import type { TallaKey } from "@/lib/tallas";
import type { Bateria, Personal, Rango } from "@/types/entities";
import type { PersonalForm } from "@/types/forms";
import { PersonalCardsMobile } from "./PersonalCardsMobile";
import { PersonalFilters } from "./PersonalFilters";
import { PersonalInlineEditForm } from "./PersonalInlineEditForm";
import { PersonalTableDesktop } from "./PersonalTableDesktop";

type PersonalSectionProps = {
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
  onOpenCreate: () => void;
  onToggleTallas: (ci: string) => void;
  onDeletePersonal: (ci: string) => void;
  onOpenRegistro: (ci: string, tipo: "ENTREGA" | "DEVOLUCION") => void;
  onOpenPersonalObservacion: (persona: Personal) => void;
  onOpenRegistroViewer: (persona: Personal) => void;
  onOpenDeliverySheet: (ci: string) => void;
  onStartEditPersonal: (persona: Personal) => void;
  onCancelEditPersonal: () => void;
  onEditPersonalChange: (field: keyof PersonalForm, value: string) => void;
  onSaveEditPersonal: (ci: string) => void;
};

export function PersonalSection({
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
  const renderInlineEditForm = (ci: string) => (
    <PersonalInlineEditForm
      editPersonal={editPersonal}
      rangos={rangos}
      baterias={baterias}
      tallaOptionsByKey={tallaOptionsByKey}
      maxFechaIngreso={maxFechaIngreso}
      onChange={onEditPersonalChange}
      onSave={() => onSaveEditPersonal(ci)}
    />
  );

  const handleToggleEdit = (persona: Personal) => {
    if (editPersonalCi === persona.ci) {
      onCancelEditPersonal();
      return;
    }
    onStartEditPersonal(persona);
  };

  return (
    <section className="ej-card mt-6 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Personal</h2>
          <p className="mt-1 text-xs text-stone-600">Orden: Grado del Personal, Apellidos y Nombres.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrintAllDeliverySheets}
            disabled={personal.length === 0}
            className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir todas las hojas
          </button>
          <button
            type="button"
            onClick={onOpenCreate}
            disabled={!canWrite}
            className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Registrar nuevo
          </button>
        </div>
      </div>

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

      <PaginationControls
        page={personalPage}
        pageSize={personalPageSize}
        totalItems={personalFiltrado.length}
        itemLabel="personas"
        onPageChange={onPersonalPageChange}
        onPageSizeChange={onPersonalPageSizeChange}
      />

      <PersonalCardsMobile
        personas={personalFiltradoPaginado}
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
        renderInlineEditForm={renderInlineEditForm}
      />

      <div className="mt-3 md:hidden">
        <PaginationControls
          page={personalPage}
          pageSize={personalPageSize}
          totalItems={personalFiltrado.length}
          itemLabel="personas"
          onPageChange={onPersonalPageChange}
          onPageSizeChange={onPersonalPageSizeChange}
        />
      </div>

      <PersonalTableDesktop
        personas={personalFiltradoPaginado}
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
        renderInlineEditForm={renderInlineEditForm}
      />

      <PaginationControls
        page={personalPage}
        pageSize={personalPageSize}
        totalItems={personalFiltrado.length}
        itemLabel="personas"
        onPageChange={onPersonalPageChange}
        onPageSizeChange={onPersonalPageSizeChange}
      />
    </section>
  );
}
