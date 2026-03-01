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
  const secondaryClass = compact
    ? "w-full rounded-lg px-3 py-2 text-xs font-semibold leading-tight text-white transition-all duration-200 hover:shadow-md active:scale-95"
    : "rounded px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:shadow-md active:scale-95";

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
      <button type="button" onClick={onToggleTallas} className={`${secondaryClass} bg-stone-600 hover:bg-stone-700`}>
        {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
      </button>
      {canWrite ? (
        <>
          <button type="button" onClick={onEntrega} className={`${secondaryClass} bg-emerald-700 hover:bg-emerald-800`}>
            Entrega
          </button>
          <button type="button" onClick={onDevolucion} className={`${secondaryClass} bg-amber-700 hover:bg-amber-800`}>
            Devolucion
          </button>
          <button type="button" onClick={onObservacion} className={`${secondaryClass} bg-teal-700 hover:bg-teal-800`}>
            Observacion
          </button>
        </>
      ) : null}
      <button type="button" onClick={onViewMoves} className={`${secondaryClass} bg-sky-700 hover:bg-sky-800 ${compact ? "col-span-2" : ""}`}>
        Ver movimientos
      </button>
      <button type="button" onClick={onOpenSheet} className={`${secondaryClass} bg-indigo-700 hover:bg-indigo-800 ${compact ? "col-span-2" : ""}`}>
        Hoja de Entrega
      </button>
    </div>
  );
}
