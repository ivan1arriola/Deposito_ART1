"use client";

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
  onOpenProfile: (persona: Personal) => void;
  onOpenSheet: (ci: string) => void;
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
  onOpenProfile,
  onOpenSheet,
}: PersonalCardsMobileProps) {
  return (
    <div className="divide-y divide-stone-200 border-t border-stone-200 @min-[53rem]:hidden">
      {personas.map((persona) => {
        const personLabel = [apellidosLabel(persona), nombresLabel(persona)]
          .filter(Boolean)
          .join(", ");
        const tallasOpen = expandedTallasByCi[persona.ci] === true;

        return (
          <article key={persona.ci} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 max-w-full [overflow-wrap:anywhere]">
                <h3 className="text-base font-semibold text-stone-900">{personLabel}</h3>
                <p className="mt-0.5 text-sm text-stone-700">
                  {persona.rango.nombreCompleto} · {persona.bateria?.nombre ?? "Sin batería"}
                </p>
                <p className="mt-0.5 text-xs text-stone-600">
                  CI {formatUruguayanCi(persona.ci)}
                  {!isValidUruguayanCi(persona.ci) ? (
                    <span className="ml-2 font-semibold text-red-800">CI con error</span>
                  ) : null}
                  {persona.telefonoContacto ? (
                    <span className="ml-2 whitespace-nowrap">
                      Cel. {formatUruguayanMobileNumber(persona.telefonoContacto)}
                    </span>
                  ) : null}
                </p>
              </div>
              <PersonalActions
                canWrite={canWrite}
                editing={editPersonalCi === persona.ci}
                tallasOpen={tallasOpen}
                personLabel={personLabel}
                onToggleEdit={() => onToggleEdit(persona)}
                onDelete={() => onDelete(persona.ci)}
                onToggleTallas={() => onToggleTallas(persona.ci)}
                onEntrega={() => onEntrega(persona.ci)}
                onDevolucion={() => onDevolucion(persona.ci)}
                onObservacion={() => onObservacion(persona)}
                onViewMoves={() => onViewMoves(persona)}
                onOpenProfile={() => onOpenProfile(persona)}
                onOpenSheet={() => onOpenSheet(persona.ci)}
              />
            </div>
            {tallasOpen ? (
              <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <PersonalTallasPanel entries={tallasEntries(tallasMap(persona.tallas))} />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
