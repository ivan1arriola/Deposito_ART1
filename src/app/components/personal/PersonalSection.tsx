"use client";

import { useState } from "react";
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
  isAdmin: boolean;
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
  onOpenProfile: (persona: Personal) => void;
  onOpenDeliverySheet: (ci: string) => void;
  onStartEditPersonal: (persona: Personal) => void;
  onCancelEditPersonal: () => void;
  onEditPersonalChange: (field: keyof PersonalForm, value: string | boolean) => void;
  onSaveEditPersonal: (ci: string) => void;
  canPromoteEditPersonalToSuboficial: boolean;
  promoteEditPersonalBusy: boolean;
  onPromoteEditPersonalToSuboficial: (ci: string, adminPassword: string) => void;
  onPrintAscensoDeliverySheet: (ci: string) => boolean;
};

type AscensoSargentoPanelProps = {
  ci: string;
  busy: boolean;
  onContinue: (ci: string, adminPassword: string) => void;
  onPrintDeliverySheet: (ci: string) => boolean;
};

function AscensoSargentoPanel({ ci, busy, onContinue, onPrintDeliverySheet }: AscensoSargentoPanelProps) {
  const [adminPassword, setAdminPassword] = useState("");
  const [printedOnce, setPrintedOnce] = useState(false);

  return (
    <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3">
      <h4 className="text-sm font-semibold text-amber-900">Ascenso a Sargento Primero</h4>
      <p className="mt-1 text-xs text-amber-900/90">
        La impresion de hoja es opcional antes del ascenso.
      </p>
      <p className="mt-1 text-xs font-semibold text-amber-950">
        Importante: cuando el ascenso finalice, ya no podras imprimir esta hoja previa.
      </p>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = adminPassword.trim();
          if (!trimmed) return;
          onContinue(ci, trimmed);
        }}
      >
        <input
          name="adminPassword"
          type="password"
          value={adminPassword}
          onChange={(event) => setAdminPassword(event.target.value)}
          placeholder="Contrasena de administrador"
          className="w-full rounded-lg border border-amber-400 px-3 py-2 text-sm"
          disabled={busy}
          required
        />
        <button
          type="button"
          onClick={() => {
            const opened = onPrintDeliverySheet(ci);
            if (opened) setPrintedOnce(true);
          }}
          disabled={busy}
          className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {printedOnce ? "Reimprimir hoja" : "Imprimir hoja"}
        </button>
        <button
          type="submit"
          disabled={busy || adminPassword.trim() === ""}
          className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continuar ascenso
        </button>
        <button
          type="button"
          onClick={() => {
            setAdminPassword("");
            setPrintedOnce(false);
          }}
          disabled={busy}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reiniciar
        </button>
      </form>
    </section>
  );
}

export function PersonalSection({
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
  onOpenProfile,
  onOpenDeliverySheet,
  onStartEditPersonal,
  onCancelEditPersonal,
  onEditPersonalChange,
  onSaveEditPersonal,
  canPromoteEditPersonalToSuboficial,
  promoteEditPersonalBusy,
  onPromoteEditPersonalToSuboficial,
  onPrintAscensoDeliverySheet,
}: PersonalSectionProps) {
  const handleToggleEdit = (persona: Personal) => {
    if (editPersonalCi === persona.ci) {
      onCancelEditPersonal();
      return;
    }
    onStartEditPersonal(persona);
  };

  const editingPersona = editPersonalCi ? personal.find((persona) => persona.ci === editPersonalCi) ?? null : null;
  const canShowAscensoBlock = Boolean(isAdmin && editingPersona && canPromoteEditPersonalToSuboficial);

  const actionGridClass = canWrite
    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
    : "grid-cols-1 sm:grid-cols-3";

  return (
    <section className="mt-6 space-y-4">
      <section className="ej-card rounded-2xl p-3 sm:p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-stone-900">Personal subalterno</h2>
          <p className="mt-1 text-xs text-stone-600">Orden: grado del personal subalterno, apellidos y nombres.</p>
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
            Imprimir lista de subalternos por bateria
          </button>
          <button
            type="button"
            onClick={onOpenCreate}
            disabled={!canWrite}
            className="ej-button h-11 w-full rounded-xl px-3 text-sm font-semibold disabled:opacity-50"
          >
            Registrar subalterno
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
        <div className="hidden md:block">
          <PaginationControls
            page={personalPage}
            pageSize={personalPageSize}
            totalItems={personalFiltrado.length}
            itemLabel="subalternos"
            onPageChange={onPersonalPageChange}
            onPageSizeChange={onPersonalPageSizeChange}
          />
        </div>

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
          onOpenProfile={onOpenProfile}
          onOpenSheet={onOpenDeliverySheet}
        />

        <div className="mt-3 md:hidden">
          <PaginationControls
            page={personalPage}
            pageSize={personalPageSize}
            totalItems={personalFiltrado.length}
            itemLabel="subalternos"
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
          onOpenProfile={onOpenProfile}
          onOpenSheet={onOpenDeliverySheet}
        />

        <div className="mt-4 hidden md:block">
          <PaginationControls
            page={personalPage}
            pageSize={personalPageSize}
            totalItems={personalFiltrado.length}
            itemLabel="subalternos"
            onPageChange={onPersonalPageChange}
            onPageSizeChange={onPersonalPageSizeChange}
          />
        </div>
      </section>

      {editPersonalCi ? (
        <ModalFrame onClose={onCancelEditPersonal} size="xl" closeOnBackdrop={false}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Editar subalterno</h3>
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
          {canShowAscensoBlock ? (
            <AscensoSargentoPanel
              key={`ascenso-${editPersonalCi}`}
              ci={editPersonalCi}
              busy={promoteEditPersonalBusy}
              onContinue={onPromoteEditPersonalToSuboficial}
              onPrintDeliverySheet={onPrintAscensoDeliverySheet}
            />
          ) : null}
        </ModalFrame>
      ) : null}
    </section>
  );
}
