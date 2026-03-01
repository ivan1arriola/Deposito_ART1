"use client";

import type { EquipoResumenData, EquipoResumenRow } from "@/types/views";

type EquipoResumenViewProps = {
  data: EquipoResumenData | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
};

function renderCompactSummary(row: EquipoResumenRow, itemNames: string[]) {
  return (
    <article key={`compact-${row.key}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">{row.nombre}</h3>
          <p className="mt-1 text-xs text-stone-500">Total general neto</p>
        </div>
        <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-800">
          {row.totalGeneral}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {row.totales.map((cantidad, index) => (
          <div key={`${row.key}-${itemNames[index]}`} className="rounded-lg border border-stone-200 bg-white px-2 py-2">
            <p className="text-[11px] font-semibold text-stone-500">{itemNames[index]}</p>
            <p className="mt-1 text-sm font-bold text-stone-900">{cantidad}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function renderDesktopTable(rows: EquipoResumenRow[], itemNames: string[]) {
  return (
    <div className="hidden overflow-auto rounded-xl border border-stone-200 md:block">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="bg-stone-100">
            <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Bateria</th>
            <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Total</th>
            {itemNames.map((itemName) => (
              <th
                key={`header-${itemName}`}
                className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600"
              >
                {itemName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.key} className={rowIndex % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
              <td className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">{row.nombre}</td>
              <td className="border-b border-stone-200 px-3 py-3">
                <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  {row.totalGeneral}
                </span>
              </td>
              {row.totales.map((cantidad, index) => (
                <td key={`${row.key}-${itemNames[index]}`} className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">
                  {cantidad}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EquipoResumenView({ data, loading, error, onReload }: EquipoResumenViewProps) {
  const itemNames = data?.items.map((item) => item.nombre) ?? [];

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Resumen de Equipo</h2>
            <p className="mt-1 text-xs text-stone-600">
              Muestra el neto actual por equipo segun movimientos registrados, agrupado por bateria y total de unidad.
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
        {!data && !loading ? <p className="mt-3 text-xs text-stone-600">Presiona Cargar resumen para ver cantidades por bateria.</p> : null}
        {loading && !data ? <p className="mt-3 text-sm text-stone-600">Cargando resumen de equipo...</p> : null}
      </article>

      {data ? (
        <>
          <article className="ej-card rounded-2xl p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-stone-900">Unidad completa</h3>
              <p className="mt-1 text-xs text-stone-600">Totales netos de todo el material activo considerado en las hojas.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
              {data.items.map((item, index) => (
                <article key={`unidad-${item.itemId}`} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{item.nombre}</p>
                  <p className="mt-2 text-2xl font-bold text-stone-900">{data.unidad.totales[index]}</p>
                </article>
              ))}
              <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Total general</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{data.unidad.totalGeneral}</p>
              </article>
            </div>
          </article>

          <article className="ej-card rounded-2xl p-4">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-stone-900">Detalle por bateria</h3>
              <p className="mt-1 text-xs text-stone-600">Cada valor representa el neto acumulado de entregas menos devoluciones.</p>
            </div>
            <div className="space-y-3 md:hidden">
              {data.baterias.map((row) => renderCompactSummary(row, itemNames))}
            </div>
            {renderDesktopTable(data.baterias, itemNames)}
            <p className="mt-3 text-xs text-stone-500">{`Generado: ${new Date(data.generatedAt).toLocaleString("es-UY")}`}</p>
          </article>
        </>
      ) : null}
    </section>
  );
}
