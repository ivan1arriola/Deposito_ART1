"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Eye, FileSpreadsheet, FileText, Users } from "lucide-react";
import { compareOptionalOrder } from "@/lib/catalog-order";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import type { HojaMatrixData } from "@/types/views";
import { LoadingInline, Card, Badge } from "@/app/components/shared";

const SIN_BATERIA_LABEL = "Sin batería";

export interface HojaMatrixViewProps {
  data: HojaMatrixData | null;
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void>;
}

export function HojaMatrixView({ data, loading, error, onReload }: HojaMatrixViewProps) {
  const [viewMode, setViewMode] = useState<"all" | "battery">("all");
  const [selectedBattery, setSelectedBattery] = useState<string | null>(null);
  const [previewRequested, setPreviewRequested] = useState(false);
  const subtitle =
    viewMode === "all"
      ? "Vista unificada de toda la unidad"
      : "Vista filtrada por subunidad operativa";

  useEffect(() => {
    if (!data && !loading) {
      onReload();
    }
  }, [data, loading, onReload]);

  const bateriaOptions = useMemo(() => {
    if (!data) return [] as string[];
    const labels = new Map<string, number | null>();
    for (const row of data.rows) {
      const label = row.bateria ?? SIN_BATERIA_LABEL;
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

  const spreadsheetHref = (() => {
    const params = new URLSearchParams();
    if (viewMode === "battery" && selectedBattery) {
      params.set("bateria", selectedBattery);
    }
    const query = params.toString();
    return query ? `/api/hoja-matrix/planilla?${query}` : "/api/hoja-matrix/planilla";
  })();

  const printDisabled = viewMode === "battery" && !selectedBattery;
  const previewDisabled = printDisabled || !data;

  return (
    <div className="mt-6">
      <Card
        padding="none"
        variant="elevated"
        className="overflow-hidden bg-gradient-to-b from-white to-[#f9f8f4]"
      >
        <div className="border-b border-[var(--color-neutral-300)] p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-[var(--color-ejercito-black)]">
                  Hoja Matriz General de Entrega
                </h2>
                {data && (
                  <Badge variant="success" size="sm">
                    {viewMode === "all"
                      ? "Unidad Completa"
                      : selectedBattery || "Pendiente Selección"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
                {subtitle} • Ordenado por grado, batería y apellidos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewRequested(true)}
                disabled={previewDisabled}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-ejercito-black)] px-5 text-sm font-extrabold text-white transition-colors hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:pointer-events-none disabled:bg-black/10 disabled:text-black/40"
              >
                <Eye className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span>{loading ? "Cargando..." : "Vista Previa"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.open(printHref, "_blank", "noopener,noreferrer")}
                  disabled={printDisabled}
                  title="Imprimir / Guardar PDF"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(0,47,112,0.2)] bg-white px-4 text-sm font-bold text-[#002f70] transition-colors hover:border-[#002f70] hover:bg-[rgba(0,47,112,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:pointer-events-none disabled:opacity-45"
                >
                  <FileText className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(spreadsheetHref, "_blank", "noopener,noreferrer")}
                  disabled={printDisabled}
                  title="Descargar Planilla"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(24,79,31,0.2)] bg-white px-4 text-sm font-bold text-[#184f1f] transition-colors hover:border-[#184f1f] hover:bg-[rgba(24,79,31,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:pointer-events-none disabled:opacity-45"
                >
                  <FileSpreadsheet className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span>Excel</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-[#2d3421] p-4 sm:p-6 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/10">
          <div className="flex flex-col gap-6">
            <div>
              <span className="mb-3 block text-xs font-extrabold uppercase tracking-[0.08em] text-white/60">
                Selección de Alcance
              </span>
              <div className="flex w-fit flex-wrap gap-2 rounded-xl border border-white/5 bg-black/20 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("all");
                    setSelectedBattery(null);
                    setPreviewRequested(false);
                  }}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                    viewMode === "all"
                      ? "bg-[#d4aa26] text-black shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:bg-[#e5bb37]"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Building2 className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span>Toda la Unidad</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("battery");
                    setPreviewRequested(false);
                  }}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                    viewMode === "battery"
                      ? "bg-[#d4aa26] text-black shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:bg-[#e5bb37]"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Users className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span>Por Batería</span>
                </button>
              </div>
            </div>

            {viewMode === "battery" && (
              <div>
                <span className="mb-3 block text-xs font-extrabold uppercase tracking-[0.08em] text-white/60">
                  Baterías Disponibles
                </span>
                <div className="flex flex-wrap gap-3">
                  {bateriaOptions.length === 0 ? (
                    <p className="py-2 text-sm italic text-white/50">
                      No se detectaron subunidades en los datos actuales.
                    </p>
                  ) : (
                    bateriaOptions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setSelectedBattery(label);
                          setPreviewRequested(false);
                        }}
                        className={`inline-flex min-h-10 items-center rounded-lg border px-5 py-2 text-[13px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                          selectedBattery === label
                            ? "border-[#d4aa26] bg-[rgba(212,170,38,0.15)] text-[#d4aa26] shadow-[0_0_15px_rgba(212,170,38,0.1)]"
                            : "border-white/15 bg-transparent text-white/70 hover:border-white/40 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-6 mt-4 rounded-lg border border-[rgb(207_15_33/20%)] bg-[rgb(207_15_33/8%)] p-4">
            <p className="text-sm font-semibold text-[var(--color-ejercito-red)]">{error}</p>
          </div>
        )}

        {loading && !data && (
          <div className="p-12 text-center">
            <LoadingInline
              label="Procesando datos de la unidad..."
              textClassName="font-bold text-stone-600"
            />
          </div>
        )}

        {data && previewRequested ? (
          <div className="border-t border-[var(--color-neutral-300)] bg-stone-200 p-2 sm:p-4">
            <div className="overflow-hidden rounded-lg border border-[var(--color-neutral-300)] bg-white shadow-[var(--shadow-sm)]">
              <iframe
                key={previewHref}
                title={viewMode === "all" ? "Vista previa unidad" : "Vista previa batería"}
                src={previewHref}
                className="h-[80vh] min-h-[800px] w-full border-0"
              />
            </div>
          </div>
        ) : (
          data && (
            <div className="border-t border-[var(--color-neutral-300)] p-6 text-center">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                La vista previa está lista. Presione el botón{" "}
                <span className="text-[var(--color-text-primary)]">&quot;Vista Previa&quot;</span>{" "}
                para visualizar la matriz.
              </p>
            </div>
          )
        )}

        {data && (
          <div className="border-t border-[var(--color-neutral-300)] bg-[rgb(0_56_133/2%)] p-4">
            <p className="text-xs font-semibold text-stone-500">
              Última actualización: {formatDateTimeForDisplay(data.generatedAt)}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
