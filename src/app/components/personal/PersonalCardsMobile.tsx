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
          <article key={persona.ci} className={`rounded-xl border p-3 ${ciValida ? "border-stone-200 bg-stone-50/80" : "border-red-300 bg-red-50/70"}`}>
            <p className={`text-xs font-mono ${ciValida ? "text-stone-600" : "font-semibold text-red-700"}`}>
              {formatUruguayanCi(persona.ci)}
              {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
            </p>
            <p className="mt-2 text-sm font-bold text-stone-900">{persona.rango.nombreCompleto}</p>
            <p className="mt-2 text-sm text-stone-900">
              <span className="font-semibold">Apellidos:</span> {apellidosLabel(persona)}
            </p>
            <p className="text-sm text-stone-900">
              <span className="font-semibold">Nombres:</span> {nombresLabel(persona)}
            </p>
            {persona.telefonoContacto ? (
              <p className="text-sm text-stone-900">
                <span className="font-semibold">Contacto:</span> {formatUruguayanMobileNumber(persona.telefonoContacto)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-stone-600">{persona.bateria?.nombre ?? "Sin bateria"}</p>

            <div className="mt-2">
              <PersonalActions
                canWrite={canWrite}
                editing={editing}
                tallasOpen={tallasOpen}
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
              <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3">
                <PersonalTallasPanel entries={tallasEntries(tallas)} />
              </div>
            ) : null}
            {editing ? <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3">{renderInlineEditForm(persona.ci)}</div> : null}
          </article>
        );
      })}
      {personas.length === 0 ? <p className="text-sm text-stone-500">Sin resultados con los filtros actuales.</p> : null}
    </div>
  );
}
