"use client";

import type { ReactNode } from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { apellidosLabel, nombresLabel, tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import { formatUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import type { Personal } from "@/types/entities";
import { PersonalActions } from "./PersonalActions";
import { PersonalTallasPanel } from "./PersonalTallasPanel";

type PersonalCardsMobileProps = {
  personas: Personal[];
  canWrite: boolean;
  expandedTallasByCi: Record<string, boolean>;
  editPersonalCi: string | null;
  onToggleEdit: (persona: Personal) => void;
  onDelete: (ci: string) => void;
  onToggleTallas: (ci: string) => void;
  onEntrega: (ci: string) => void;
  onDevolucion: (ci: string) => void;
  onObservacion: (persona: Personal) => void;
  onViewMoves: (persona: Personal) => void;
  onOpenSheet: (ci: string) => void;
  renderInlineEditForm: (ci: string) => ReactNode;
};

export function PersonalCardsMobile({
  personas,
  canWrite,
  expandedTallasByCi,
  editPersonalCi,
  onToggleEdit,
  onDelete,
  onToggleTallas,
  onEntrega,
  onDevolucion,
  onObservacion,
  onViewMoves,
  onOpenSheet,
  renderInlineEditForm,
}: PersonalCardsMobileProps) {
  return (
    <div className="mt-3 space-y-3 md:hidden">
      {personas.map((persona) => {
        const tallas = tallasMap(persona.tallas);
        const ciValida = isValidUruguayanCi(persona.ci);
        const tallasOpen = expandedTallasByCi[persona.ci] === true;
        const editing = editPersonalCi === persona.ci;

        return (
          <article key={persona.ci} className={`rounded-2xl border p-4 shadow-sm ${ciValida ? "border-stone-200 bg-white" : "border-red-300 bg-red-50/70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-xs font-mono ${ciValida ? "text-stone-600" : "font-semibold text-red-700"}`}>
                  {formatUruguayanCi(persona.ci)}
                  {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
                </p>
                <p className="mt-2 text-sm font-bold text-stone-900">{persona.rango.nombreCompleto}</p>
              </div>
              <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-700">
                {persona.bateria?.nombre ?? "Sin bateria"}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-sm text-stone-900">
              <p>
                <span className="font-semibold">Apellidos:</span> {apellidosLabel(persona)}
              </p>
              <p>
                <span className="font-semibold">Nombres:</span> {nombresLabel(persona)}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Contacto</p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {persona.telefonoContacto ? formatUruguayanMobileNumber(persona.telefonoContacto) : "No registrado"}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Estado</p>
                <p className={`mt-1 text-sm font-medium ${ciValida ? "text-emerald-700" : "text-red-700"}`}>
                  {ciValida ? "CI validada" : "CI con error"}
                </p>
              </div>
            </div>

            <div className="mt-2">
              <PersonalActions
                canWrite={canWrite}
                editing={editing}
                tallasOpen={tallasOpen}
                compact
                onToggleEdit={() => onToggleEdit(persona)}
                onDelete={() => onDelete(persona.ci)}
                onToggleTallas={() => onToggleTallas(persona.ci)}
                onEntrega={() => onEntrega(persona.ci)}
                onDevolucion={() => onDevolucion(persona.ci)}
                onObservacion={() => onObservacion(persona)}
                onViewMoves={() => onViewMoves(persona)}
                onOpenSheet={() => onOpenSheet(persona.ci)}
              />
            </div>

            {tallasOpen ? (
              <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <PersonalTallasPanel entries={tallasEntries(tallas)} />
              </div>
            ) : null}
            {editing ? <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">{renderInlineEditForm(persona.ci)}</div> : null}
          </article>
        );
      })}
      {personas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          Sin resultados con los filtros actuales.
        </div>
      ) : null}
    </div>
  );
}
