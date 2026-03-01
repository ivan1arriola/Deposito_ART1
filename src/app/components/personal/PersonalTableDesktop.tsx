"use client";

import { Fragment, type ReactNode } from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { apellidosLabel, nombresLabel, tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import type { Personal } from "@/types/entities";
import { PersonalActions } from "./PersonalActions";
import { PersonalTallasPanel } from "./PersonalTallasPanel";

type PersonalTableDesktopProps = {
  personas: Personal[];
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

export function PersonalTableDesktop({
  personas,
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
}: PersonalTableDesktopProps) {
  return (
    <div className="mt-3 hidden md:block">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
          <tr>
            <th className="w-[11%] px-3 py-2">CI</th>
            <th className="w-[15%] px-3 py-2">Grado del Personal</th>
            <th className="w-[18%] px-3 py-2">Apellidos</th>
            <th className="w-[18%] px-3 py-2">Nombres</th>
            <th className="w-[13%] px-3 py-2">Batería</th>
            <th className="w-[9%] px-3 py-2">Detalles</th>
            <th className="w-[16%] px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-300">
          {personas.map((persona, index) => {
            const tallas = tallasMap(persona.tallas);
            const ciValida = isValidUruguayanCi(persona.ci);
            const tallasOpen = expandedTallasByCi[persona.ci] === true;
            const editing = editPersonalCi === persona.ci;
            const isEven = index % 2 === 0;

            return (
              <Fragment key={persona.ci}>
                <tr className={!ciValida ? "bg-red-50/60" : isEven ? "bg-white" : "bg-stone-100"}>
                  <td className={`px-3 py-2 font-mono text-xs ${ciValida ? "text-stone-700" : "font-bold text-red-700"}`}>
                    <div>
                      {formatUruguayanCi(persona.ci)}
                      {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-stone-900">
                    <span className="font-bold">{persona.rango.nombreCompleto}</span>
                  </td>
                  <td className="px-3 py-2 text-stone-900">{apellidosLabel(persona)}</td>
                  <td className="px-3 py-2 text-stone-900">{nombresLabel(persona)}</td>
                  <td className="px-3 py-2 text-stone-700">{persona.bateria?.nombre ?? "Sin batería"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleTallas(persona.ci)}
                      className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 transition-all duration-200 hover:border-stone-400 hover:bg-stone-50 hover:shadow-sm active:scale-95"
                    >
                      {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
                    </button>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <PersonalActions
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
                  </td>
                </tr>
                {tallasOpen ? (
                  <tr className="bg-stone-50/80">
                    <td colSpan={7} className="px-3 py-2">
                      <PersonalTallasPanel entries={tallasEntries(tallas)} desktop />
                    </td>
                  </tr>
                ) : null}
                {editing ? (
                  <tr className="bg-white">
                    <td colSpan={7} className="px-3 py-3">
                      {renderInlineEditForm(persona.ci)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {personas.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-4 text-sm text-stone-500">
                Sin resultados con los filtros actuales.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
