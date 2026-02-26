"use client";

import { formatUruguayanCi } from "@/lib/ci";
import type { HojaMatrixData } from "@/types/views";

export interface HojaMatrixViewProps {
  data: HojaMatrixData | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}

export function HojaMatrixView({ data, loading, error, onReload }: HojaMatrixViewProps) {
  return (
    <section className="ej-card mt-6 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Hoja Matriz</h2>
          <p className="mt-1 text-xs text-stone-600">
            Vista matricial por personal. Ordenada por bateria, grado y apellido. Totales por item segun registros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onReload()}
            disabled={loading}
            className="rounded bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar Matriz"}
          </button>
          <button
            type="button"
            onClick={() => window.open("/hoja-matriz", "_blank", "noopener,noreferrer")}
            className="rounded bg-indigo-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Generar hoja
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      {loading && !data ? <p className="mt-3 text-sm text-stone-600">Cargando Hoja Matriz...</p> : null}

      {data ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-stone-600">{`Generado: ${new Date(data.generatedAt).toLocaleString("es-UY")}`}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-stone-100 text-[11px] uppercase tracking-wide text-stone-700">
                <tr>
                  <th className="px-2 py-2">Bateria</th>
                  <th className="px-2 py-2">Grado</th>
                  <th className="px-2 py-2">Apellidos</th>
                  <th className="px-2 py-2">Nombres</th>
                  <th className="px-2 py-2">CI</th>
                  {data.items.map((item) => (
                    <th key={item.itemId} className="px-2 py-2 text-right">
                      {item.nombre}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.rows.map((row) => (
                  <tr key={row.ci}>
                    <td className="whitespace-nowrap px-2 py-2 text-stone-700">{row.bateria ?? "Sin bateria"}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-semibold text-stone-900">{row.grado}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-stone-900">{`${row.apellido1} ${row.apellido2 ?? ""}`.replace(/\s+/g, " ").trim()}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-stone-900">{`${row.nombre1} ${row.nombre2 ?? ""}`.replace(/\s+/g, " ").trim()}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-stone-700">{formatUruguayanCi(row.ci)}</td>
                    {row.totales.map((cantidad, index) => (
                      <td
                        key={`${row.ci}-${data.items[index]?.itemId ?? index}`}
                        className={`px-2 py-2 text-right font-semibold ${cantidad < 0 ? "text-rose-700" : "text-stone-900"}`}
                      >
                        {cantidad}
                      </td>
                    ))}
                    <td className={`px-2 py-2 text-right font-bold ${row.totalGeneral < 0 ? "text-rose-700" : "text-stone-900"}`}>
                      {row.totalGeneral}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
