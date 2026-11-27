"use client";

import { useMemo } from "react";
import { LoadingInline } from "@/app/components/shared";
import { tallasMap } from "@/lib/form-mappers";
import { TALLA_KEYS, TALLA_LABELS } from "@/lib/tallas";
import type { OficialSuboficial, TipoOficialSuboficial } from "@/types/entities";

type OficialesSuboficialesResumenViewProps = {
  oficialesSuboficiales: OficialSuboficial[];
  viewType: TipoOficialSuboficial;
  loading: boolean;
  onReload: () => Promise<void>;
};

export function OficialesSuboficialesResumenView({
  oficialesSuboficiales,
  viewType,
  loading,
  onReload,
}: OficialesSuboficialesResumenViewProps) {
  const registros = useMemo(
    () => oficialesSuboficiales.filter((registro) => registro.tipo === viewType),
    [oficialesSuboficiales, viewType]
  );

  const typeLabel = viewType === "OFICIAL" ? "oficiales" : "suboficiales";
  const typeColumnLabel = viewType === "OFICIAL" ? "Oficiales" : "Suboficiales";

  const tallasResumen = useMemo(
    () =>
      TALLA_KEYS.map((key) => {
        const counter = new Map<string, number>();

        for (const registro of registros) {
          const talles = tallasMap(registro.tallas);
          const value = talles[key] && talles[key] !== "-" ? talles[key] : "Sin dato";
          counter.set(value, (counter.get(value) ?? 0) + 1);
        }

        const tallas = Array.from(counter.keys()).sort((a, b) => {
          if (a === "Sin dato") return 1;
          if (b === "Sin dato") return -1;
          return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
        });

        return {
          key,
          label: TALLA_LABELS[key],
          rows: tallas.map((talla) => {
            return {
              talla,
              cantidad: counter.get(talla) ?? 0,
            };
          }),
        };
      }),
    [registros]
  );

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{`Resumen de talles de ${typeLabel}`}</h2>
            <p className="mt-1 text-xs text-stone-600">{`Tabla consolidada por prenda y talla para ${typeLabel}.`}</p>
          </div>
          <button
            type="button"
            onClick={() => void onReload()}
            disabled={loading}
            className="rounded bg-stone-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? (
              <LoadingInline
                label="Actualizando..."
                size="xs"
                tone="light"
                textClassName="text-xs font-semibold text-white"
              />
            ) : (
              "Actualizar resumen"
            )}
          </button>
        </div>
      </article>

      <article className="ej-card rounded-2xl p-4">
        <div className="space-y-4">
          {tallasResumen.map((section) => (
            <article
              key={`resumen-${section.key}`}
              className="rounded-xl border border-stone-200 bg-white p-3"
            >
              <h3 className="text-sm font-semibold text-stone-900">{section.label}</h3>
              {section.rows.length === 0 ? (
                <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
                  Sin datos.
                </p>
              ) : (
                <div className="mt-2 overflow-auto rounded-lg border border-stone-200">
                  <table className="w-full table-fixed border-collapse text-left text-xs">
                    <colgroup>
                      <col className="w-2/3" />
                      <col className="w-1/3" />
                    </colgroup>
                    <thead>
                      <tr className="bg-stone-100">
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                          Talla
                        </th>
                        <th className="border-b border-stone-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                          {typeColumnLabel}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, index) => (
                        <tr
                          key={`${section.key}-${row.talla}`}
                          className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}
                        >
                          <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">
                            {row.talla}
                          </td>
                          <td className="border-b border-stone-200 px-3 py-2 text-right text-sm font-semibold tabular-nums text-stone-900">
                            {row.cantidad}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
