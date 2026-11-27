"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoadingInline } from "@/app/components/shared";
import { api } from "@/lib/api";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { MainView, MovimientoRecintoViewRow, StockDashboardData } from "@/types/views";

type OperationalDashboardViewProps = {
  canWrite: boolean;
  isAdmin: boolean;
  onNavigateView: (view: MainView) => void;
  onOpenEntrega: () => void;
  onOpenAsignacion: () => void;
  onOpenPrestamo: () => void;
};

type RecintosApiResponse = {
  generatedAt?: string;
  total?: number;
  rows?: MovimientoRecintoViewRow[];
};

export function OperationalDashboardView({
  canWrite,
  isAdmin,
  onNavigateView,
  onOpenEntrega,
  onOpenAsignacion,
  onOpenPrestamo,
}: OperationalDashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockDashboardData | null>(null);
  const [recintosRows, setRecintosRows] = useState<MovimientoRecintoViewRow[]>([]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockPayload, recintosPayload] = await Promise.all([
        api<StockDashboardData>("/api/stock"),
        api<RecintosApiResponse>("/api/movimientos/recintos"),
      ]);
      setStockData(stockPayload);
      setRecintosRows(Array.isArray(recintosPayload?.rows) ? recintosPayload.rows : []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el resumen operativo del depósito."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const metrics = useMemo(() => {
    const resumen = stockData?.resumen ?? [];
    const prestamos = stockData?.prestamos ?? [];
    const asignacionesVigentes = recintosRows.filter((row) => !row.anulado).length;
    const prestamosPendientes = prestamos.filter((p) => p.estado === "PENDIENTE").length;
    const diferenciasSie = resumen.filter(
      (item) => item.stockUnidad !== (item.existenciaSie ?? 0)
    ).length;
    const stockNegativo = resumen.filter((item) => item.stockDeposito < 0).length;

    return {
      asignacionesVigentes,
      prestamosPendientes,
      diferenciasSie,
      stockNegativo,
    };
  }, [stockData, recintosRows]);

  const recentHistorial = useMemo(() => (stockData?.historial ?? []).slice(0, 5), [stockData]);
  const recentAsignaciones = useMemo(() => recintosRows.slice(0, 5), [recintosRows]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8" aria-label="Resumen operativo">
      <div className="rounded-2xl border border-white/15 bg-white/95 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Operación del Depósito
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-stone-900">
              Panel Operativo Principal
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Accesos rápidos, estado vigente del inventario y actividad reciente de movimientos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={loading}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-800 hover:bg-stone-100 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar resumen"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Acciones rápidas">
          {canWrite ? (
            <>
              <button
                type="button"
                onClick={onOpenEntrega}
                className="min-h-[44px] rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900"
              >
                Nueva entrega
              </button>
              <button
                type="button"
                onClick={onOpenAsignacion}
                className="min-h-[44px] rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-800"
              >
                Nueva asignación
              </button>
              <button
                type="button"
                onClick={onOpenPrestamo}
                className="min-h-[44px] rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-800"
              >
                Registrar préstamo
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() =>
              window.open("/listado-equipos-unidad?autoprint=1", "_blank", "noopener,noreferrer")
            }
            className="min-h-[44px] rounded-xl border border-stone-300 bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
          >
            Imprimir stock unidad
          </button>
          <button
            type="button"
            onClick={() => onNavigateView("stock_total")}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100"
          >
            Stock de equipos
          </button>
          <button
            type="button"
            onClick={() => onNavigateView("movimientos_recintos")}
            className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100"
          >
            Asignaciones a recintos
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => onNavigateView("auditoria")}
              className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100"
            >
              Auditoría detallada
            </button>
          ) : null}
        </div>

        {loading && !stockData ? (
          <div className="mt-6">
            <LoadingInline
              label="Cargando resumen operativo..."
              textClassName="text-sm font-medium text-stone-700"
            />
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadSummary()}
              className="min-h-[44px] rounded-lg border border-rose-400 bg-white px-3 py-1.5 text-xs font-bold text-rose-900 hover:bg-rose-100"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!loading || stockData ? (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
                  Asignaciones vigentes
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums text-stone-900">
                  {metrics.asignacionesVigentes}
                </p>
              </article>
              <article className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
                  Préstamos pendientes
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums text-amber-800">
                  {metrics.prestamosPendientes}
                </p>
              </article>
              <article className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
                  Diferencias SIE
                </p>
                <p className="mt-2 text-2xl font-black tabular-nums text-sky-900">
                  {metrics.diferenciasSie}
                </p>
              </article>
              <article
                className={`rounded-xl border p-4 ${
                  metrics.stockNegativo > 0
                    ? "border-rose-300 bg-rose-50"
                    : "border-stone-200 bg-stone-50"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-stone-600">
                  Stock negativo en depósito
                </p>
                <p
                  className={`mt-2 flex items-center gap-2 text-2xl font-black tabular-nums ${
                    metrics.stockNegativo > 0 ? "text-rose-800" : "text-stone-900"
                  }`}
                >
                  {metrics.stockNegativo > 0 ? (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-700 text-xs font-black text-white"
                    >
                      !
                    </span>
                  ) : null}
                  <span>{metrics.stockNegativo}</span>
                </p>
              </article>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-stone-900">Actividad reciente de stock</h3>
                  <button
                    type="button"
                    onClick={() => onNavigateView("stock_historial")}
                    className="text-xs font-semibold text-sky-800 hover:underline"
                  >
                    Ver historial
                  </button>
                </div>
                {recentHistorial.length === 0 ? (
                  <p className="mt-3 text-xs text-stone-600">
                    No hay movimientos recientes registrados en el historial de stock.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-stone-100">
                    {recentHistorial.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-stone-900">
                            {entry.tipo} · {entry.persona ?? "Sin destinatario"}
                          </p>
                          <p className="text-stone-600">{formatDateOnlyForDisplay(entry.fecha)}</p>
                        </div>
                        <span className="font-bold tabular-nums text-stone-800">
                          {entry.totalUnidades} u.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-stone-900">Asignaciones recientes</h3>
                  <button
                    type="button"
                    onClick={() => onNavigateView("movimientos_recintos")}
                    className="text-xs font-semibold text-sky-800 hover:underline"
                  >
                    Ver todas
                  </button>
                </div>
                {recentAsignaciones.length === 0 ? (
                  <p className="mt-3 text-xs text-stone-600">
                    No hay asignaciones registradas hasta el momento.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-stone-100">
                    {recentAsignaciones.map((row) => (
                      <li
                        key={row.movimientoId}
                        className="flex items-center justify-between gap-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-stone-900">
                            {row.nombre}
                            {row.anulado ? (
                              <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">
                                Anulada
                              </span>
                            ) : null}
                          </p>
                          <p className="text-stone-600">
                            {row.clase} · {row.fecha}
                          </p>
                        </div>
                        <span className="font-bold tabular-nums text-stone-800">
                          {row.equipos.length} eq. / {row.articulos?.length ?? 0} art.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
