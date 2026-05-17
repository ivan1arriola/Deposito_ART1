"use client";

import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { useState, useMemo, type ReactNode } from "react";
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
  onEmailAllDeliverySheets: () => void;
  onCancelEmailAllDeliverySheets: () => void;
  emailAllDeliverySheetsBusy: boolean;
  emailAllDeliverySheetsDisabledReason: string | null;
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

type QuickActionTone = "emerald" | "indigo" | "slate" | "sky" | "blue";

type QuickActionButtonProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: QuickActionTone;
  disabled?: boolean;
  tooltip?: string | null;
  onClick: () => void;
};

const quickActionToneStyles: Record<QuickActionTone, { rail: string }> = {
  emerald: {
    rail: "linear-gradient(180deg, #e3c777 0%, #7f935a 100%)",
  },
  indigo: {
    rail: "linear-gradient(180deg, #e3c777 0%, #516a94 100%)",
  },
  slate: {
    rail: "linear-gradient(180deg, #e3c777 0%, #6f5b42 100%)",
  },
  sky: {
    rail: "linear-gradient(180deg, #e3c777 0%, #5f8693 100%)",
  },
  blue: {
    rail: "linear-gradient(180deg, #e3c777 0%, #31568a 100%)",
  },
};

function QuickActionButton({
  eyebrow,
  title,
  description,
  icon,
  tone,
  disabled = false,
  tooltip = null,
  onClick,
}: QuickActionButtonProps) {
  const toneStyles = quickActionToneStyles[tone];
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative isolate flex min-h-[116px] w-full flex-col justify-between overflow-hidden rounded-[22px] border border-[rgba(20,20,18,0.72)] px-4 py-3 text-left text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),var(--shadow-sm)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,204,0,0.28)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        backgroundColor: "#5f6c46",
        backgroundImage:
          "linear-gradient(90deg, rgba(24,27,21,0.58) 0%, rgba(255,255,255,0.04) 38%, rgba(24,27,21,0.48) 100%), repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0 2px, rgba(0,0,0,0) 2px 7px)",
      }}
    >
      <span aria-hidden className="absolute inset-y-3 left-0 w-[4px] rounded-r-full" style={{ backgroundImage: toneStyles.rail }} />
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-black/25" />
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em]"
          style={{
            borderColor: "rgba(245, 214, 135, 0.26)",
            backgroundColor: "rgba(19, 23, 17, 0.42)",
            color: "rgba(255, 226, 152, 0.94)",
          }}
        >
          {eyebrow}
        </span>
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
          style={{
            borderColor: "rgba(214, 197, 150, 0.34)",
            background: "linear-gradient(145deg, rgba(18,22,16,0.92) 0%, rgba(58,68,47,0.86) 100%)",
            color: "#f2dfad",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4">
        <div className="text-[15px] font-semibold leading-snug tracking-[0.01em] text-white">{title}</div>
        <p className="mt-1.5 text-[12px] leading-5 text-[rgba(243,245,237,0.84)]">{description}</p>
      </div>
    </button>
  );

  if (tooltip) {
    return (
      <div className="w-full" title={tooltip}>
        {button}
      </div>
    );
  }

  return button;
}

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
  onPersonalPageSizeChange,
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

  const editingPersona = editPersonalCi ? personal.find((persona) => persona.ci === editPersonalCi) ?? null : null;
  const canShowAscensoBlock = Boolean(isAdmin && editingPersona && canPromoteEditPersonalToSuboficial);

  const actionGridClass = canWrite
    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4";

  const personalConErrorReingreso = useMemo(() => {
    return personal.filter(
      (persona) => persona.esReingreso && (!persona.fechaIngreso || persona.fechaIngreso.trim() === "")
    );
  }, [personal]);

  return (
    <section className="mt-6 space-y-4">
      <section className="ej-card overflow-hidden rounded-[28px] p-3 sm:p-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-stone-900">Personal subalterno</h2>
          <p className="mt-1 text-xs text-stone-600">Orden: grado del personal subalterno, apellidos y nombres.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-[rgba(39,47,33,0.82)] bg-[linear-gradient(180deg,rgba(61,71,49,0.98)_0%,rgba(40,49,33,0.98)_100%)] px-3 py-1 text-xs font-bold text-[rgba(244,220,151,0.95)]">
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
        <div className={`mt-4 grid w-full gap-3 ${actionGridClass}`}>
          {canWrite ? (
            <QuickActionButton
              eyebrow="Masivo"
              title="Registrar entrega masiva"
              description="Carga un mismo movimiento para varios subalternos."
              icon={<FactCheckOutlinedIcon fontSize="small" />}
              tone="emerald"
              onClick={onOpenMassEntrega}
              disabled={loading || personalFiltrado.length === 0}
            />
          ) : null}
          <QuickActionButton
            eyebrow="PDF"
            title="Imprimir hojas de entrega"
            description="Abre el PDF consolidado de toda la unidad."
            icon={<PrintOutlinedIcon fontSize="small" />}
            tone="indigo"
            onClick={onPrintAllDeliverySheets}
            disabled={loading || personal.length === 0}
          />
          <QuickActionButton
            eyebrow={emailAllDeliverySheetsBusy ? "En curso" : "Correo"}
            title={
              emailAllDeliverySheetsBusy
                ? "Cancelar envío de hojas de entrega en segundo plano"
                : "Enviar hojas de entrega al correo de referencia"
            }
            description={
              emailAllDeliverySheetsBusy
                ? "Detiene el seguimiento actual y solicita cancelar el envío en el servidor."
                : "Genera el PDF consolidado de hojas de entrega y lo envia a tu correo configurado."
            }
            icon={<ForwardToInboxOutlinedIcon fontSize="small" />}
            tone="slate"
            onClick={emailAllDeliverySheetsBusy ? onCancelEmailAllDeliverySheets : onEmailAllDeliverySheets}
            disabled={loading || personal.length === 0 || (!emailAllDeliverySheetsBusy && Boolean(emailAllDeliverySheetsDisabledReason))}
            tooltip={emailAllDeliverySheetsBusy ? null : emailAllDeliverySheetsDisabledReason}
          />
          <QuickActionButton
            eyebrow="Listado"
            title="Imprimir lista por bateria"
            description="Genera el listado ordenado de subalternos por bateria."
            icon={<ViewAgendaOutlinedIcon fontSize="small" />}
            tone="sky"
            onClick={onPrintPersonnelByBattery}
            disabled={loading || personal.length === 0}
          />
          <QuickActionButton
            eyebrow="Alta"
            title="Registrar subalterno"
            description="Crea una nueva ficha y la deja disponible de inmediato."
            icon={<AddCircleOutlineRoundedIcon fontSize="small" />}
            tone="blue"
            onClick={onOpenCreate}
            disabled={!canWrite}
          />
        </div>
      </section>

      {personalConErrorReingreso.length > 0 ? (
        <section className="rounded-2xl border border-rose-300/80 bg-gradient-to-r from-rose-50/90 to-amber-50/80 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
              <WarningAmberRoundedIcon />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-rose-950">
                Atención: Fichas de reingreso incompletas (Fecha Re-ingreso obligatoria)
              </h3>
              <p className="mt-0.5 text-xs text-rose-800 font-medium">
                Se detectó personal marcado como reingreso sin la fecha correspondiente registrada. Selecciona &quot;Corregir&quot; para ingresar el dato faltante.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {personalConErrorReingreso.map((persona) => (
                  <div key={persona.ci} className="flex items-center justify-between rounded-xl bg-white p-3 border border-rose-200 shadow-xs hover:border-rose-300 transition">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-stone-900 truncate">
                        {persona.rango.nombreCompleto}
                      </p>
                      <p className="text-xs text-stone-700 truncate">
                        {persona.apellido1} {persona.nombre1}
                      </p>
                      <p className="text-[10px] text-stone-500 font-mono">
                        CI {persona.ci}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleEdit(persona)}
                      className="shrink-0 rounded-lg bg-rose-700 hover:bg-rose-800 transition px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                    >
                      Corregir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

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

      <section className="rounded-[28px] border border-[rgba(88,80,58,0.18)] bg-[linear-gradient(180deg,rgba(247,244,234,0.96)_0%,rgba(232,228,213,0.94)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] sm:p-4">
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
