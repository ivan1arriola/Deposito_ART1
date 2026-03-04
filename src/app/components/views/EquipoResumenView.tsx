"use client";

import { useMemo } from "react";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import type { EquipoResumenData } from "@/types/views";

type EquipoResumenViewProps = {
  data: EquipoResumenData | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
};

type EquipoResumenDisplayRow = {
  itemId: string;
  nombre: string;
  valoresPorBateria: Array<{ key: string; nombre: string; total: number }>;
  totalUnidad: number;
};

export function EquipoResumenView({ data, loading, error, onReload }: EquipoResumenViewProps) {
  const rows = useMemo<EquipoResumenDisplayRow[]>(() => {
    if (!data) return [];

    return data.items.map((item, index) => ({
      itemId: item.itemId,
      nombre: item.nombre,
      valoresPorBateria: data.baterias.map((bateria) => ({
        key: bateria.key,
        nombre: bateria.nombre,
        total: bateria.totales[index] ?? 0,
      })),
      totalUnidad: data.unidad.totales[index] ?? 0,
    }));
  }, [data]);

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Resumen de Equipo en Baterías</h2>
            <p className="mt-1 text-xs text-stone-600">
              Muestra cómo está distribuido cada equipo entre las baterías. Filas por equipo y columnas por batería, con una última columna para el total de la unidad.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onReload()}
            disabled={loading}
            className="rounded bg-stone-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Actualizando..." : data ? "Actualizar resumen" : "Cargar resumen"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
        ) : null}
        {!data && !loading ? <p className="mt-3 text-xs text-stone-600">Presiona Cargar resumen para ver cantidades por batería y unidad.</p> : null}
        {loading && !data ? <p className="mt-3 text-sm text-stone-600">Cargando resumen de equipo en baterías...</p> : null}
      </article>

      {data ? (
        <article className="ej-card rounded-2xl p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-stone-900">Total de equipo en baterías según hojas de entrega</h3>
            <p className="mt-1 text-xs text-stone-600">
              La primera columna muestra los nombres de los equipos. Cada fila representa un equipo, cada columna representa una batería y la columna final representa el total de las baterías, que es lo mismo que el total de la unidad.
            </p>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <article key={`mobile-${row.itemId}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-stone-900">{row.nombre}</h4>
                  <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-800">
                    {row.totalUnidad}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Total unidad</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {row.valoresPorBateria.map((bateria) => (
                    <div key={`mobile-${row.itemId}-${bateria.key}`} className="rounded-lg border border-stone-200 bg-white px-2 py-2">
                      <p className="text-[11px] font-semibold text-stone-500">{bateria.nombre}</p>
                      <p className="mt-1 text-sm font-bold text-stone-900">{bateria.total}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-auto rounded-xl border border-stone-200 md:block">
            <table className="w-full min-w-max border-collapse text-left text-xs">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Equipo</th>
                  {data.baterias.map((bateria) => (
                    <th
                      key={`header-${bateria.key}`}
                      className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600"
                    >
                      {bateria.nombre}
                    </th>
                  ))}
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Unidad</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.itemId} className={rowIndex % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                    <td className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">{row.nombre}</td>
                    {row.valoresPorBateria.map((bateria) => (
                      <td
                        key={`cell-${row.itemId}-${bateria.key}`}
                        className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900"
                      >
                        {bateria.total}
                      </td>
                    ))}
                    <td className="border-b border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-900">{row.totalUnidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-stone-500">{`Generado: ${formatDateTimeForDisplay(data.generatedAt)}`}</p>
        </article>
      ) : null}
    </section>
  );
}
