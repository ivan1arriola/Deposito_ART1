"use client";

import { SmallActionButton } from "@/app/components/shared";

type PersonalActionsProps = {
  canWrite: boolean;
  editing: boolean;
  tallasOpen: boolean;
  compact?: boolean;
  showTallasAction?: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onToggleTallas: () => void;
  onEntrega: () => void;
  onDevolucion: () => void;
  onObservacion: () => void;
  onViewMoves: () => void;
  onOpenProfile: () => void;
  onOpenSheet: () => void;
};

export function PersonalActions({
  canWrite,
  editing,
  tallasOpen,
  compact = false,
  showTallasAction = true,
  onToggleEdit,
  onDelete,
  onToggleTallas,
  onEntrega,
  onDevolucion,
  onObservacion,
  onViewMoves,
  onOpenProfile,
  onOpenSheet,
}: PersonalActionsProps) {
  const actionClass = compact
    ? "w-full rounded-xl border px-3 py-2.5 text-xs font-semibold leading-tight text-[rgba(245,239,219,0.96)] transition-all duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,204,0,0.24)] active:translate-y-0"
    : "rounded-lg border px-2.5 py-1.5 text-xs font-medium text-[rgba(245,239,219,0.96)] transition-all duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,204,0,0.24)] active:translate-y-0";

  const actionWithIconClass = `${actionClass} inline-flex equipos-center justify-center gap-1.5`;
  const actionToneClass = {
    taupe: "border-[rgba(74,67,53,0.86)] bg-[linear-gradient(180deg,rgba(95,86,71,0.98)_0%,rgba(58,52,43,0.98)_100%)]",
    olive: "border-[rgba(63,74,49,0.86)] bg-[linear-gradient(180deg,rgba(79,92,58,0.98)_0%,rgba(50,60,38,0.98)_100%)]",
    bronze: "border-[rgba(104,73,28,0.9)] bg-[linear-gradient(180deg,rgba(143,93,25,0.98)_0%,rgba(105,67,18,0.98)_100%)]",
    steel: "border-[rgba(65,87,97,0.88)] bg-[linear-gradient(180deg,rgba(80,104,114,0.98)_0%,rgba(54,72,80,0.98)_100%)]",
    navy: "border-[rgba(37,58,89,0.9)] bg-[linear-gradient(180deg,rgba(49,74,115,0.98)_0%,rgba(31,48,76,0.98)_100%)]",
    charcoal: "border-[rgba(35,41,52,0.92)] bg-[linear-gradient(180deg,rgba(49,58,72,0.98)_0%,rgba(31,37,47,0.98)_100%)]",
    dossier: "border-[rgba(21,56,101,0.9)] bg-[linear-gradient(180deg,rgba(26,63,119,0.98)_0%,rgba(16,38,73,0.98)_100%)]",
    indigo: "border-[rgba(55,48,163,0.9)] bg-[linear-gradient(180deg,rgba(79,70,229,0.98)_0%,rgba(49,46,129,0.98)_100%)]",
  } as const;

  return (
    <div className={compact ? "grid grid-cols-2 gap-1.5" : "flex flex-wrap gap-2"}>
      {canWrite ? (
        <>
          <SmallActionButton
            text={editing ? "Cancelar" : "Editar"}
            tone={editing ? "neutral" : "edit"}
            className={compact ? "w-full text-[11px] leading-tight" : undefined}
            onClick={onToggleEdit}
          />
          <SmallActionButton
            text="Borrar"
            tone="delete"
            className={compact ? "w-full text-[11px] leading-tight" : undefined}
            onClick={onDelete}
          />
        </>
      ) : null}
      {showTallasAction ? (
        <button type="button" onClick={onToggleTallas} className={`${actionWithIconClass} ${actionToneClass.taupe}`}>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m6 10V7M4 19h16" />
          </svg>
          {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
        </button>
      ) : null}
      {canWrite ? (
        <>
          <button type="button" onClick={onEntrega} className={`${actionWithIconClass} ${actionToneClass.olive}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Entrega
          </button>
          <button type="button" onClick={onDevolucion} className={`${actionWithIconClass} ${actionToneClass.bronze}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Devolución
          </button>
          <button type="button" onClick={onObservacion} className={`${actionWithIconClass} ${actionToneClass.steel}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8m-8 4h5M7 5h10a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
            Observación
          </button>
        </>
      ) : null}
      <button type="button" onClick={onViewMoves} className={`${actionWithIconClass} ${actionToneClass.navy} ${compact ? "col-span-2" : ""}`}>
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h3v4H3v-4zm5-7h3v11H8V10zm5-5h3v16h-3V5zm5 8h3v8h-3v-8z" />
        </svg>
        Ver movimientos
      </button>
      <button type="button" onClick={onOpenProfile} className={`${actionWithIconClass} ${actionToneClass.charcoal} ${compact ? "col-span-2" : ""}`}>
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
        Ver ficha completa
      </button>
      <button
        type="button"
        onClick={onOpenSheet}
        className={`${actionWithIconClass} ${actionToneClass.dossier} ${compact ? "col-span-2" : ""}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h8l3 3v13H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
        Hoja de Entrega
      </button>
    </div>
  );
}
