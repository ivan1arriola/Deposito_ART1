"use client";

import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import { formatUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import type { Personal } from "@/types/entities";
import { PersonalActions } from "./PersonalActions";

type PersonalTableDesktopProps = {
  personas: Personal[];
  canWrite: boolean;
  editPersonalCi: string | null;
  onToggleEdit: (persona: Personal) => void;
  onDelete: (ci: string) => void;
  onEntrega: (ci: string) => void;
  onDevolucion: (ci: string) => void;
  onObservacion: (persona: Personal) => void;
  onViewMoves: (persona: Personal) => void;
  onOpenProfile: (persona: Personal) => void;
  onOpenSheet: (ci: string) => void;
};

const measures = [
  { key: "PARKA", label: "Parka" },
  { key: "CAMISACO", label: "Camis.", fullLabel: "Camisaco" },
  { key: "PANTALON", label: "Pant.", fullLabel: "Pantalón" },
  { key: "KEPI", label: "Kepi" },
  { key: "CALZADO", label: "Calz.", fullLabel: "Calzado" },
] as const;

export function PersonalTableDesktop({
  personas,
  canWrite,
  editPersonalCi,
  onToggleEdit,
  onDelete,
  onEntrega,
  onDevolucion,
  onObservacion,
  onViewMoves,
  onOpenProfile,
  onOpenSheet,
}: PersonalTableDesktopProps) {
  return (
    <div className="hidden @min-[53rem]:block">
      <table aria-label="Personal subalterno" className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          {measures.map(({ key }) => (
            <col key={key} />
          ))}
          <col className={canWrite ? "w-52" : "w-36"} />
        </colgroup>
        <thead className="border-y border-stone-200 bg-stone-100 text-xs font-semibold text-stone-700">
          <tr>
            <th scope="col" className="py-2.5 pl-4 pr-2">
              Apellidos y nombres
            </th>
            <th scope="col" className="px-2 py-2.5">
              Cédula
            </th>
            <th scope="col" className="px-2 py-2.5">
              Grado
            </th>
            <th scope="col" className="px-2 py-2.5">
              Batería
            </th>
            {measures.map((measure) => (
              <th key={measure.key} scope="col" className="px-0.5 py-2.5 text-center">
                {"fullLabel" in measure ? (
                  <>
                    <span className="sr-only">{measure.fullLabel}</span>
                    <span aria-hidden="true" title={measure.fullLabel}>
                      {measure.label}
                    </span>
                  </>
                ) : (
                  measure.label
                )}
              </th>
            ))}
            <th scope="col" className="py-2.5 pl-3 pr-2">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {personas.map((persona) => {
            const tallas = tallasMap(persona.tallas);
            const ciValida = isValidUruguayanCi(persona.ci);
            const personLabel = [apellidosLabel(persona), nombresLabel(persona)]
              .filter(Boolean)
              .join(", ");

            return (
              <tr
                key={persona.ci}
                className={ciValida ? "hover:bg-stone-50 focus-within:bg-stone-50" : "bg-red-50"}
              >
                <th
                  scope="row"
                  className="py-2 pl-4 pr-2 font-semibold text-stone-900 [overflow-wrap:anywhere]"
                >
                  {personLabel}
                  {persona.telefonoContacto ? (
                    <span className="mt-0.5 block text-xs font-normal text-stone-600">
                      Cel. {formatUruguayanMobileNumber(persona.telefonoContacto)}
                    </span>
                  ) : null}
                </th>
                <td className="px-2 py-2 text-xs tabular-nums text-stone-700">
                  <span className="whitespace-nowrap">{formatUruguayanCi(persona.ci)}</span>
                  {!ciValida ? (
                    <span className="block font-semibold text-red-800">CI con error</span>
                  ) : null}
                </td>
                <td className="px-2 py-2 text-stone-700 [overflow-wrap:anywhere]">
                  {persona.rango.nombreCompleto}
                </td>
                <td className="px-2 py-2 text-stone-700 [overflow-wrap:anywhere]">
                  {persona.bateria?.nombre ?? "Sin batería"}
                </td>
                {measures.map(({ key }) => (
                  <td
                    key={key}
                    className="px-0.5 py-2 text-center text-xs tabular-nums text-stone-700 [overflow-wrap:anywhere]"
                  >
                    {tallas[key] || "—"}
                  </td>
                ))}
                <td className="py-1 pl-1 pr-2">
                  <PersonalActions
                    canWrite={canWrite}
                    editing={editPersonalCi === persona.ci}
                    tallasOpen={false}
                    personLabel={personLabel}
                    onToggleEdit={() => onToggleEdit(persona)}
                    onDelete={() => onDelete(persona.ci)}
                    onEntrega={() => onEntrega(persona.ci)}
                    onDevolucion={() => onDevolucion(persona.ci)}
                    onObservacion={() => onObservacion(persona)}
                    onViewMoves={() => onViewMoves(persona)}
                    onOpenProfile={() => onOpenProfile(persona)}
                    onOpenSheet={() => onOpenSheet(persona.ci)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
