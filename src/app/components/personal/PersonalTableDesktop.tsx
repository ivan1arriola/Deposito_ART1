"use client";

import { Fragment, useState } from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { apellidosLabel, nombresLabel, tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import { formatUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import type { Personal } from "@/types/entities";
import { PersonalActions } from "./PersonalActions";
import { PersonalTallasPanel } from "./PersonalTallasPanel";

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
}: PersonalTableDesktopProps) {
  const [expandedPhoneByCi, setExpandedPhoneByCi] = useState<Record<string, boolean>>({});

  return (
    <div className="mt-3 hidden overflow-hidden rounded-[26px] border border-[rgba(95,86,61,0.18)] bg-[linear-gradient(180deg,rgba(247,244,234,0.94)_0%,rgba(233,228,214,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] md:block">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-[#d8d1bb] text-xs uppercase tracking-wide text-[#5a4529]">
          <tr>
            <th className="w-[11%] px-3 py-2">CI</th>
            <th className="w-[15%] px-3 py-2">Grado</th>
            <th className="w-[18%] px-3 py-2">Apellidos</th>
            <th className="w-[18%] px-3 py-2">Nombres</th>
            <th className="w-[13%] px-3 py-2">Batería</th>
            <th className="w-[25%] px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(144,133,103,0.22)]">
          {personas.map((persona, index) => {
            const tallas = tallasMap(persona.tallas);
            const ciValida = isValidUruguayanCi(persona.ci);
            const phoneOpen = expandedPhoneByCi[persona.ci] === true;
            const tallasOpen = expandedTallasByCi[persona.ci] === true;
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
                  <td className="px-3 py-2 text-stone-900">
                    <span className="font-bold">{persona.rango.nombreCompleto}</span>
                  </td>
                  <td className="px-3 py-2 text-stone-900">{apellidosLabel(persona)}</td>
                  <td className="px-3 py-2 text-stone-900">
                    <div>{nombresLabel(persona)}</div>
                    {persona.telefonoContacto ? (
                      <div className="mt-1 text-xs text-stone-500">{`Contacto: ${formatUruguayanMobileNumber(persona.telefonoContacto)}`}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-stone-700">{persona.bateria?.nombre ?? "Sin batería"}</td>
                  <td className="px-2 py-2 align-top">
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPhoneByCi((prev) => ({
                            ...prev,
                            [persona.ci]: !prev[persona.ci],
                          }))
                        }
                        disabled={!persona.telefonoContacto}
                        className="w-full rounded-xl border border-[rgba(95,86,61,0.22)] bg-[linear-gradient(180deg,rgba(250,248,240,0.96)_0%,rgba(237,233,220,0.94)_100%)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition duration-150 hover:border-[rgba(95,86,61,0.34)] hover:bg-[rgba(94,107,72,0.08)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[rgba(95,86,61,0.22)] disabled:hover:bg-[linear-gradient(180deg,rgba(250,248,240,0.96)_0%,rgba(237,233,220,0.94)_100%)]"
                      >
                        {!persona.telefonoContacto ? "Sin celular" : phoneOpen ? "Ocultar celular" : "Ver celular"}
                      </button>
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
                        onOpenProfile={() => onOpenProfile(persona)}
                        onOpenSheet={() => onOpenSheet(persona.ci)}
                      />
                    </div>
                  </td>
                </tr>
                {phoneOpen && persona.telefonoContacto ? (
                  <tr className="bg-[rgba(239,234,220,0.72)]">
                    <td colSpan={6} className="px-3 py-2">
                      <div className="rounded-xl border border-[rgba(95,86,61,0.16)] bg-[linear-gradient(180deg,rgba(250,248,240,0.92)_0%,rgba(237,233,220,0.9)_100%)] px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Celular de contacto</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">{formatUruguayanMobileNumber(persona.telefonoContacto)}</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {tallasOpen ? (
                  <tr className="bg-[rgba(239,234,220,0.72)]">
                    <td colSpan={6} className="px-3 py-2">
                      <PersonalTallasPanel entries={tallasEntries(tallas)} desktop />
                    </td>
                  </tr>
                ) : null}
                {editing ? (
                  <tr className="bg-[rgba(248,245,236,0.92)]">
                    <td colSpan={6} className="px-3 py-2 text-xs font-medium text-stone-600">
                      Editando en modal...
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {personas.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-sm text-stone-500">
                Sin resultados con los filtros actuales.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
