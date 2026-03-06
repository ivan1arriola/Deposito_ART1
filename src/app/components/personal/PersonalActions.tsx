"use client";

import { SmallActionButton } from "@/app/components/shared";

type PersonalActionsProps = {
  canWrite: boolean;
  editing: boolean;
  tallasOpen: boolean;
  compact?: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onToggleTallas: () => void;
  onEntrega: () => void;
  onDevolucion: () => void;
  onObservacion: () => void;
  onViewMoves: () => void;
  onOpenSheet: () => void;
};

export function PersonalActions({
  canWrite,
  editing,
  tallasOpen,
  compact = false,
  onToggleEdit,
  onDelete,
  onToggleTallas,
  onEntrega,
  onDevolucion,
  onObservacion,
  onViewMoves,
  onOpenSheet,
}: PersonalActionsProps) {
  const actionClass = compact
    ? "w-full rounded-lg border px-3 py-2 text-xs font-semibold leading-tight text-white transition-all duration-200 hover:shadow-md active:scale-95"
    : "rounded border px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:shadow-md active:scale-95";

  const actionWithIconClass = `${actionClass} inline-flex items-center justify-center gap-1.5`;

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
      <button type="button" onClick={onToggleTallas} className={`${actionWithIconClass} border-stone-500 bg-stone-600 hover:bg-stone-700`}>
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m6 10V7M4 19h16" />
        </svg>
        {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
      </button>
      {canWrite ? (
        <>
          <button type="button" onClick={onEntrega} className={`${actionWithIconClass} border-emerald-600 bg-emerald-700 hover:bg-emerald-800`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Entrega
          </button>
          <button type="button" onClick={onDevolucion} className={`${actionWithIconClass} border-amber-600 bg-amber-700 hover:bg-amber-800`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Devolución
          </button>
          <button type="button" onClick={onObservacion} className={`${actionWithIconClass} border-cyan-600 bg-cyan-700 hover:bg-cyan-800`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8m-8 4h5M7 5h10a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
            </svg>
            Observación
          </button>
        </>
      ) : null}
      <button type="button" onClick={onViewMoves} className={`${actionWithIconClass} border-blue-600 bg-blue-700 hover:bg-blue-800 ${compact ? "col-span-2" : ""}`}>
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h3v4H3v-4zm5-7h3v11H8V10zm5-5h3v16h-3V5zm5 8h3v8h-3v-8z" />
        </svg>
        Ver movimientos
      </button>
      <button
        type="button"
        onClick={onOpenSheet}
        className={`${actionWithIconClass} border-[var(--brand-charcoal)] bg-[var(--brand-charcoal)] hover:bg-[#2b2922] ${compact ? "col-span-2" : ""}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h8l3 3v13H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
        Hoja de Entrega
      </button>
    </div>
  );
}
