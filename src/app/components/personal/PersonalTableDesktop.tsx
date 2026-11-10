"use client";

import { Fragment } from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import { formatUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import type { Personal } from "@/types/entities";
import { PersonalActions } from "./PersonalActions";

type PersonalTableDesktopProps = {
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

export function PersonalTableDesktop({
  personas,
  canWrite,
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
}: PersonalTableDesktopProps) {

  return (
    <div className="mt-3 hidden overflow-hidden rounded-[26px] border border-[rgba(95,86,61,0.18)] bg-[linear-gradient(180deg,rgba(247,244,234,0.94)_0%,rgba(233,228,214,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] md:block">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-[#d8d1bb] text-xs uppercase tracking-wide text-[#5a4529]">
          <tr>
            <th className="w-[9%] px-2 py-2">CI</th>
            <th className="w-[12%] px-2 py-2">Grado</th>
            <th className="w-[12%] px-2 py-2">Apellidos</th>
            <th className="w-[13%] px-2 py-2">Nombres</th>
            <th className="w-[10%] px-2 py-2">Batería</th>
            <th className="w-[6%] px-2 py-2" title="Parka">Parka</th>
            <th className="w-[6%] px-2 py-2" title="Camisaco">Camis.</th>
            <th className="w-[6%] px-2 py-2" title="Pantalon">Pant.</th>
            <th className="w-[6%] px-2 py-2" title="Kepi">Kepi</th>
            <th className="w-[6%] px-2 py-2" title="Calzado">Calz.</th>
            <th className="w-[14%] px-2 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(144,133,103,0.22)]">
          {personas.map((persona, index) => {
            const tallas = tallasMap(persona.tallas);
            const ciValida = isValidUruguayanCi(persona.ci);
            const editing = editPersonalCi === persona.ci;
            const isEven = index % 2 === 0;

            return (
              <Fragment key={persona.ci}>
                <tr className={!ciValida ? "bg-[rgba(218,95,84,0.12)]" : isEven ? "bg-[rgba(248,245,236,0.92)]" : "bg-[rgba(239,234,220,0.88)]"}>
                  <td className={`px-3 py-2 font-mono text-xs ${ciValida ? "text-stone-700" : "font-bold text-red-700"}`}>
                    <div>
                      {formatUruguayanCi(persona.ci)}
                      {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-stone-900">
                    <span className="font-bold">{persona.rango.nombreCompleto}</span>
                  </td>
                  <td className="px-2 py-2 text-stone-900">{apellidosLabel(persona)}</td>
                  <td className="px-2 py-2 text-stone-900">
                    <div>{nombresLabel(persona)}</div>
                    {persona.telefonoContacto ? (
                      <div className="mt-1 text-[10px] text-stone-500">{`Cel: ${formatUruguayanMobileNumber(persona.telefonoContacto)}`}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-stone-700">{persona.bateria?.nombre ?? "Sin batería"}</td>
                  <td className="px-2 py-2 text-stone-900">{tallas.PARKA}</td>
                  <td className="px-2 py-2 text-stone-900">{tallas.CAMISACO}</td>
                  <td className="px-2 py-2 text-stone-900">{tallas.PANTALON}</td>
                  <td className="px-2 py-2 text-stone-900">{tallas.KEPI}</td>
                  <td className="px-2 py-2 text-stone-900">{tallas.CALZADO}</td>
                  <td className="px-2 py-2 align-top">
                    <div className="space-y-1.5">
                      <PersonalActions
                        canWrite={canWrite}
                        editing={editing}
                        tallasOpen={false}
                        showTallasAction={false}
                        compact
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
                  </td>
                </tr>

                {editing ? (
                  <tr className="bg-[rgba(248,245,236,0.92)]">
                    <td colSpan={11} className="px-3 py-2 text-xs font-medium text-stone-600">
                      Editando en modal...
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {personas.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-3 py-4 text-sm text-stone-500">
                Sin resultados con los filtros actuales.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
