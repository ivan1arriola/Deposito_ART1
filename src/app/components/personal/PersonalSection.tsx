"use client";

import { AlertTriangle, ClipboardCheck, Mail, Plus, Printer, Rows3 } from "lucide-react";
import { Pagination } from "@mui/material";
import { useState, useMemo } from "react";
import { LoadingInline } from "@/app/components/shared";
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
  onEmailAllDeliverySheets: () => void;
  onCancelEmailAllDeliverySheets: () => void;
  emailAllDeliverySheetsBusy: boolean;
  emailAllDeliverySheetsDisabledReason: string | null;
  onPrintPersonnelByBattery: () => void;
  onOpenMassEntrega: () => void;
  onOpenRecintoEntrega: () => void;
  onOpenCreate: () => void;
  onToggleTallas: (ci: string) => void;
  onDeletePersonal: (ci: string) => void;
  onOpenRegistro: (ci: string, tipo: "ENTREGA" | "DEVOLUCION" | "ASIGNACION") => void;
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

function AscensoSargentoPanel({
  ci,
  busy,
  onContinue,
  onPrintDeliverySheet,
}: AscensoSargentoPanelProps) {
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
          placeholder="Contraseña de administrador"
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
  onPrintAllDeliverySheets,
  onEmailAllDeliverySheets,
  onCancelEmailAllDeliverySheets,
  emailAllDeliverySheetsBusy,
  emailAllDeliverySheetsDisabledReason,
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

  const editingPersona = editPersonalCi
    ? (personal.find((persona) => persona.ci === editPersonalCi) ?? null)
    : null;
  const canShowAscensoBlock = Boolean(
    isAdmin && editingPersona && canPromoteEditPersonalToSuboficial
  );

  const personalConErrorReingreso = useMemo(() => {
    return personal.filter(
      (persona) =>
        persona.esReingreso && (!persona.fechaIngreso || persona.fechaIngreso.trim() === "")
    );
  }, [personal]);

  const total = personalFiltrado.length;
  const pages = Math.max(1, Math.ceil(total / personalPageSize));
  const page = Math.min(Math.max(1, personalPage), pages);
  const from = (page - 1) * personalPageSize + 1;
  const to = Math.min(page * personalPageSize, total);
  const documentsDisabled = loading || personal.length === 0;
  const emailDisabledReason = emailAllDeliverySheetsBusy
    ? null
    : emailAllDeliverySheetsDisabledReason;
  const operations = [
    ...(canWrite
      ? [
          {
            id: "mass-delivery",
            label: "Registrar entrega masiva",
            icon: <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />,
            onClick: onOpenMassEntrega,
            disabled: loading || total === 0,
          },
        ]
      : []),
    {
      id: "print-sheets",
      label: "Imprimir hojas de entrega",
      icon: <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />,
      onClick: onPrintAllDeliverySheets,
      disabled: documentsDisabled,
    },
    {
      id: "email-sheets",
      label: emailAllDeliverySheetsBusy ? "Cancelar envío de hojas" : "Enviar hojas por correo",
      icon: <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />,
      onClick: emailAllDeliverySheetsBusy
        ? onCancelEmailAllDeliverySheets
        : onEmailAllDeliverySheets,
      disabled: documentsDisabled || Boolean(emailDisabledReason),
    },
    {
      id: "print-list",
      label: "Imprimir lista por batería",
      icon: <Rows3 className="h-4 w-4 shrink-0" aria-hidden="true" />,
      onClick: onPrintPersonnelByBattery,
      disabled: documentsDisabled,
    },
    ...(canWrite
      ? [
          {
            id: "register",
            label: "Registrar subalterno",
            icon: <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />,
            onClick: onOpenCreate,
            disabled: false,
          },
        ]
      : []),
  ];

  return (
    <section
      aria-labelledby="personal-directory-title"
      className="@container min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white text-stone-900"
    >
      <header className="px-4 pb-3 pt-4">
        <div>
          <h2 id="personal-directory-title" className="text-2xl font-bold tracking-tight">
            Personal subalterno
          </h2>
          <p role="status" className="mt-0.5 text-sm text-stone-600">
            {total} resultado{total === 1 ? "" : "s"}
            {hasPersonalFilters ? " de " + personal.length : ""}
          </p>
        </div>
        <div
          role="group"
          aria-label="Operaciones de personal"
          className="mt-3 grid grid-cols-2 gap-2 @min-[38rem]:flex @min-[38rem]:flex-wrap"
        >
          {operations.map(({ id, label, icon, onClick, disabled }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              disabled={disabled}
              aria-describedby={
                id === "email-sheets" && emailDisabledReason ? "personal-email-reason" : undefined
              }
              className={
                "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 " +
                (id === "register"
                  ? "bg-[var(--color-ejercito-blue)] text-white hover:bg-blue-950"
                  : "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:bg-stone-100 disabled:text-stone-600")
              }
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        {emailDisabledReason ? (
          <p id="personal-email-reason" className="mt-2 text-xs text-stone-600">
            {emailDisabledReason}
          </p>
        ) : null}
      </header>

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

      {personalConErrorReingreso.length > 0 ? (
        <details className="mx-4 mb-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-950">
          <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800">
            <AlertTriangle className="mx-1 inline h-4 w-4 shrink-0" aria-hidden="true" />
            Fichas de reingreso sin fecha ({personalConErrorReingreso.length})
          </summary>
          <ul className="divide-y divide-amber-200 px-3">
            {personalConErrorReingreso.map((persona) => (
              <li
                key={persona.ci}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>
                  {persona.apellido1} {persona.nombre1} · CI {persona.ci}
                </span>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => handleToggleEdit(persona)}
                    className="min-h-11 rounded-lg px-2 font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                  >
                    Corregir
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {loading ? (
        <div className="border-t border-stone-200 px-4 py-3">
          <LoadingInline label="Actualizando datos…" size="xs" />
        </div>
      ) : null}

      {personalFiltradoPaginado.length > 0 ? (
        <>
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
          <PersonalTableDesktop
            personas={personalFiltradoPaginado}
            canWrite={canWrite}
            editPersonalCi={editPersonalCi}
            onToggleEdit={handleToggleEdit}
            onDelete={onDeletePersonal}
            onEntrega={(ci) => onOpenRegistro(ci, "ENTREGA")}
            onDevolucion={(ci) => onOpenRegistro(ci, "DEVOLUCION")}
            onObservacion={onOpenPersonalObservacion}
            onViewMoves={onOpenRegistroViewer}
            onOpenProfile={onOpenProfile}
            onOpenSheet={onOpenDeliverySheet}
          />
          {pages > 1 ? (
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-4 py-3">
              <p className="text-sm text-stone-600">
                Mostrando {from} a {to} de {total} subalternos
              </p>
              <Pagination
                aria-label="Páginas de personal subalterno"
                count={pages}
                page={page}
                onChange={(_, nextPage) => onPersonalPageChange(nextPage)}
                color="primary"
                shape="rounded"
                size="small"
                siblingCount={0}
                getItemAriaLabel={(type, itemPage, selected) => {
                  if (type === "page") return "Página " + itemPage + (selected ? ", actual" : "");
                  if (type === "previous") return "Página anterior";
                  if (type === "next") return "Página siguiente";
                  return type === "first" ? "Primera página" : "Última página";
                }}
                sx={{ "& .MuiPaginationItem-root": { minWidth: 36, height: 36 } }}
              />
            </footer>
          ) : null}
        </>
      ) : loading ? null : (
        <p className="border-t border-stone-200 px-4 py-8 text-center text-sm text-stone-600">
          {hasPersonalFilters
            ? "Sin resultados con los filtros actuales."
            : "No hay subalternos registrados."}
        </p>
      )}

      {editPersonalCi ? (
        <ModalFrame onClose={onCancelEditPersonal} size="xl" closeOnBackdrop={false}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Editar subalterno</h3>
              <p className="mt-1 text-sm text-stone-600">
                {editingPersona
                  ? `${editingPersona.rango.nombreCompleto} - ${editingPersona.apellido1} ${editingPersona.nombre1}`
                  : `CI ${editPersonalCi}`}
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
