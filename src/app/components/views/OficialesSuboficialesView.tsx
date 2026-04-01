"use client";

import { useMemo } from "react";
import { formatUruguayanCi } from "@/lib/ci";
import { tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import { TALLA_KEYS, TALLA_LABELS } from "@/lib/tallas";
import { LoadingInline } from "@/app/components/shared";
import type { OficialSuboficial, TipoOficialSuboficial } from "@/types/entities";

type OficialesSuboficialesViewProps = {
  oficialesSuboficiales: OficialSuboficial[];
  loading: boolean;
  canWrite: boolean;
  viewType: TipoOficialSuboficial;
  onOpenCreate: () => void;
  onStartEdit: (registro: OficialSuboficial) => void;
  onReload: () => Promise<void>;
};

const TYPE_LABEL: Record<TipoOficialSuboficial, string> = {
  OFICIAL: "Oficiales",
  SUBOFICIAL: "Suboficiales",
};

export function OficialesSuboficialesView({
  oficialesSuboficiales,
  loading,
  canWrite,
  viewType,
  onOpenCreate,
  onStartEdit,
  onReload,
}: OficialesSuboficialesViewProps) {
  const registros = useMemo(
    () => oficialesSuboficiales.filter((registro) => registro.tipo === viewType),
    [oficialesSuboficiales, viewType],
  );

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
    [registros],
  );

  const createLabel = viewType === "OFICIAL" ? "Registrar oficial" : "Registrar suboficial";

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{TYPE_LABEL[viewType]}</h2>
            <p className="mt-1 text-xs text-stone-600">
              {`Listado de ${TYPE_LABEL[viewType].toLowerCase()} con su grado y talles.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canWrite ? (
              <button
                type="button"
                onClick={onOpenCreate}
                className="rounded bg-lime-500 px-3 py-2 text-xs font-semibold text-stone-900 transition hover:bg-lime-400"
              >
                {createLabel}
              </button>
            ) : null}
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
        </div>
      </article>

      <article className="ej-card rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-900">{TYPE_LABEL[viewType]}</h3>
          <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-700">
            {registros.length}
          </span>
        </div>

        {registros.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
            Sin registros para esta categoria.
          </p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {registros.map((registro) => {
                const talles = tallasMap(registro.tallas);
                return (
                  <article key={`mobile-${viewType}-${registro.ci}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
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
                    {canWrite ? (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onStartEdit(registro)}
                          className="rounded border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                        >
                          Editar
                        </button>
                      </div>
                    ) : null}
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
                    {canWrite ? (
                      <th className="border-b border-stone-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-600">Acciones</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro, index) => {
                    const talles = tallasMap(registro.tallas);
                    return (
                      <tr key={`desktop-${viewType}-${registro.ci}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
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
                        {canWrite ? (
                          <td className="border-b border-stone-200 px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onStartEdit(registro)}
                              className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 transition hover:bg-stone-100"
                            >
                              Editar
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>

      <article className="ej-card rounded-2xl p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-stone-900">{`Resumen de talles de ${TYPE_LABEL[viewType].toLowerCase()}`}</h3>
          <p className="mt-1 text-xs text-stone-600">{`Tabla de talles solo para ${TYPE_LABEL[viewType].toLowerCase()}.`}</p>
        </div>
        <div className="space-y-4">
          {tallasResumen.map((section) => (
            <article key={`resumen-${section.key}`} className="rounded-xl border border-stone-200 bg-white p-3">
              <h4 className="text-sm font-semibold text-stone-900">{section.label}</h4>
              {section.rows.length === 0 ? (
                <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">Sin datos.</p>
              ) : (
                <div className="mt-2 overflow-auto rounded-lg border border-stone-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100">
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Talla</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                          {TYPE_LABEL[viewType]}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, index) => (
                        <tr key={`${section.key}-${row.talla}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                          <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.talla}</td>
                          <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.cantidad}</td>
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
