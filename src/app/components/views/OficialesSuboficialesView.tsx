"use client";

import { useMemo } from "react";
import { formatUruguayanCi } from "@/lib/ci";
import { tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import { LoadingInline } from "@/app/components/shared";
import type { OficialSuboficial, TipoOficialSuboficial } from "@/types/entities";

type OficialesSuboficialesViewProps = {
  oficialesSuboficiales: OficialSuboficial[];
  loading: boolean;
  onReload: () => Promise<void>;
};

const TYPE_LABEL: Record<TipoOficialSuboficial, string> = {
  OFICIAL: "Oficiales",
  SUBOFICIAL: "Sub Oficiales",
};

export function OficialesSuboficialesView({
  oficialesSuboficiales,
  loading,
  onReload,
}: OficialesSuboficialesViewProps) {
  const grouped = useMemo(
    () => ({
      OFICIAL: oficialesSuboficiales.filter((registro) => registro.tipo === "OFICIAL"),
      SUBOFICIAL: oficialesSuboficiales.filter((registro) => registro.tipo === "SUBOFICIAL"),
    }),
    [oficialesSuboficiales],
  );

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">SS.OO y SUB OF.</h2>
            <p className="mt-1 text-xs text-stone-600">
              Listado de Oficiales y Sub Oficiales con su grado y talles.
            </p>
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
              "Actualizar listado"
            )}
          </button>
        </div>
      </article>

      {(["OFICIAL", "SUBOFICIAL"] as const).map((tipo) => (
        <article key={tipo} className="ej-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900">{TYPE_LABEL[tipo]}</h3>
            <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
              {grouped[tipo].length}
            </span>
          </div>

          {grouped[tipo].length === 0 ? (
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
              Sin registros para esta categoria.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {grouped[tipo].map((registro) => {
                  const talles = tallasMap(registro.tallas);
                  return (
                    <article key={`mobile-${tipo}-${registro.ci}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <p className="text-xs font-mono text-stone-600">{formatUruguayanCi(registro.ci)}</p>
                      <p className="mt-1 text-sm font-semibold text-stone-900">
                        {registro.apellido}, {registro.nombre}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        {registro.gradoMando.abreviacion} - {registro.gradoMando.nombreCompleto}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {tallasEntries(talles).map((entry) => (
                          <div key={`mobile-talla-${registro.ci}-${entry.key}`} className="rounded-md border border-stone-200 bg-white px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{entry.label}</p>
                            <p className="mt-1 text-sm font-bold text-stone-900">{entry.value}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-auto rounded-xl border border-stone-200 md:block">
                <table className="w-full min-w-max border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">CI</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Apellido</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Nombre</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Grado</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Parka</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Camisaco</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Pantalon</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Kepi</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Calzado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[tipo].map((registro, index) => {
                      const talles = tallasMap(registro.tallas);
                      return (
                        <tr key={`desktop-${tipo}-${registro.ci}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                          <td className="border-b border-stone-200 px-3 py-3 font-mono text-xs text-stone-700">{formatUruguayanCi(registro.ci)}</td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">{registro.apellido}</td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm text-stone-900">{registro.nombre}</td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm text-stone-900">
                            {registro.gradoMando.abreviacion} - {registro.gradoMando.nombreCompleto}
                          </td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm text-stone-900">{talles.PARKA}</td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm text-stone-900">{talles.CAMISACO}</td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm text-stone-900">{talles.PANTALON}</td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm text-stone-900">{talles.KEPI}</td>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm text-stone-900">{talles.CALZADO}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
