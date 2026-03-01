"use client";

import { useMemo, useState } from "react";
import { compareOptionalOrder } from "@/lib/catalog-order";
import type { HojaMatrixData } from "@/types/views";

export interface HojaMatrixViewProps {
  data: HojaMatrixData | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}

export function HojaMatrixView({ data, loading, error, onReload }: HojaMatrixViewProps) {
  const [viewMode, setViewMode] = useState<"all" | "battery">("all");
  const [selectedBattery, setSelectedBattery] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(Boolean(data));
  const title = viewMode === "all" ? "Hoja Matriz Unidad" : "Hoja Matriz por Batería";

  const bateriaOptions = useMemo(() => {
    if (!data) return [] as string[];
    const labels = new Map<string, number | null>();
    for (const row of data.rows) {
      const label = row.bateria ?? "Sin bateria";
      const current = labels.get(label);
      if (current === undefined || compareOptionalOrder(row.bateriaOrden, current) < 0) {
        labels.set(label, row.bateriaOrden);
      }
    }
    return Array.from(labels.entries())
      .sort((a, b) => {
        const byOrder = compareOptionalOrder(a[1], b[1]);
        if (byOrder !== 0) return byOrder;
        return a[0].localeCompare(b[0], "es", { sensitivity: "base" });
      })
      .map(([label]) => label);
  }, [data]);

  const handleLoad = async () => {
    setHasRequested(true);
    await onReload();
  };

  const previewHref = (() => {
    const params = new URLSearchParams();
    if (viewMode === "battery" && selectedBattery) {
      params.set("bateria", selectedBattery);
    }
    const query = params.toString();
    return query ? `/hoja-matriz?${query}` : "/hoja-matriz";
  })();

  const printHref = (() => {
    const params = new URLSearchParams();
    params.set("autoprint", "1");
    if (viewMode === "battery" && selectedBattery) {
      params.set("bateria", selectedBattery);
    }
    return `/hoja-matriz?${params.toString()}`;
  })();

  const printDisabled = viewMode === "battery" && !selectedBattery;

  return (
    <section className="mt-6 rounded-2xl border border-stone-300 bg-white p-4 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <p className="mt-1 text-xs text-stone-600">
            En unidad se ordena por grado, batería y apellido. En batería se ordena por grado y apellido.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLoad}
            disabled={loading}
            className="rounded bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Actualizando..." : hasRequested ? "Actualizar Matriz" : "Cargar Matriz"}
          </button>
          <button
            type="button"
            onClick={() => window.open(printHref, "_blank", "noopener,noreferrer")}
            disabled={printDisabled}
            className="rounded bg-indigo-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Seleccion de vista</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setViewMode("all");
              setSelectedBattery(null);
            }}
            className={`rounded px-3 py-2 text-xs font-semibold transition ${
              viewMode === "all"
                ? "bg-stone-900 text-white"
                : "border border-stone-300 bg-white text-stone-700"
            }`}
          >
            Ver toda la unidad
          </button>
          <button
            type="button"
            onClick={() => setViewMode("battery")}
            className={`rounded px-3 py-2 text-xs font-semibold transition ${
              viewMode === "battery"
                ? "bg-stone-900 text-white"
                : "border border-stone-300 bg-white text-stone-700"
            }`}
          >
            Ver por bateria
          </button>
        </div>

        {viewMode === "battery" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {bateriaOptions.length === 0 ? (
              <span className="text-xs text-stone-500">Cargue los datos para ver las baterias disponibles.</span>
            ) : (
              bateriaOptions.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedBattery(label)}
                  className={`rounded px-3 py-2 text-xs font-semibold transition ${
                    selectedBattery === label
                      ? "bg-emerald-600 text-white"
                      : "border border-stone-300 bg-white text-stone-700"
                  }`}
                >
                  {label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      {loading && !data ? <p className="mt-3 text-sm text-stone-600">Cargando Hoja Matriz...</p> : null}

      {hasRequested && viewMode === "battery" && !selectedBattery && data ? (
        <p className="mt-3 text-xs font-semibold text-stone-600">Seleccione una bateria para mostrar la matriz.</p>
      ) : null}

      {!hasRequested && !loading ? (
        <p className="mt-3 text-xs text-stone-600">Seleccione la vista y presione Cargar Matriz.</p>
      ) : null}

      {data && hasRequested ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-stone-300 bg-stone-100">
          <iframe
            key={previewHref}
            title={viewMode === "all" ? "Vista previa de hoja matriz unidad" : "Vista previa de hoja matriz por batería"}
            src={previewHref}
            className="h-[80vh] min-h-[900px] w-full bg-white"
          />
        </div>
      ) : null}

      {data && hasRequested ? (
        <div className="mt-2">
          <p className="text-xs text-stone-500">{`Generado: ${new Date(data.generatedAt).toLocaleString("es-UY")}`}</p>
        </div>
      ) : null}
    </section>
  );
}
