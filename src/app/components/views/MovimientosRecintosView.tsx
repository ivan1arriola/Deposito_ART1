"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingInline } from "@/app/components/shared";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { MovimientoRecintoViewRow } from "@/types/views";
import { ModalFrame } from "@/app/components/modals/ModalFrame";

type MovimientosRecintosResponse = {
  generatedAt: string;
  total: number;
  rows: MovimientoRecintoViewRow[];
};

type MovimientosRecintosViewProps = {
  canWrite: boolean;
  canDelete: boolean;
  onOpenRegistro: (tipo: "ENTREGA" | "DEVOLUCION" | "ASIGNACION") => void;
  onDeleteRegistro: (registroId: string, fechaLabel: string, nombreLabel: string, onSuccess: () => void) => void;
  onRectifyRegistro: (registroId: string) => void;
};

export function MovimientosRecintosView({ canWrite, canDelete, onOpenRegistro, onDeleteRegistro, onRectifyRegistro }: MovimientosRecintosViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [rows, setRows] = useState<MovimientoRecintoViewRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [detailRow, setDetailRow] = useState<MovimientoRecintoViewRow | null>(null);

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/movimientos/recintos?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as MovimientosRecintosResponse | { error?: string };
      if (!response.ok) {
        throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Error" : "Error");
      }

      const data = payload as MovimientosRecintosResponse;
      setRows(data.rows);
      setGeneratedAt(data.generatedAt);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo cargar el listado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const rowSearchIndex = useMemo(
    () =>
      buildSearchIndex(rows, {
        text: (row) => [
          row.fecha,
          row.tipo,
          row.clase,
          row.nombre,
          ...(row.equipos || []).map((i) => `${i.equipo} ${i.cantidad}`),
          row.observaciones || "",
          row.usuarioEntrega || "",
        ].join(" "),
      }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return filterSearchIndex(rowSearchIndex, search);
  }, [rowSearchIndex, search]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      // Sort by fecha
      if (a.fecha !== b.fecha) {
        return sortDirection === "desc" ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha);
      }
      return 0;
    });
  }, [filteredRows, sortDirection]);

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap equipos-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Asignaciones a Recintos y Externos</h2>
            <p className="mt-1 text-xs text-stone-600">
              Listado global de asignaciones realizadas a recintos, departamentos internos o personal externo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenRegistro("ASIGNACION")}
                  disabled={loading}
                  className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-800 disabled:opacity-60"
                >
                  Registrar Asignación
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => window.open("/listado-asignaciones?autoprint=1", "_blank")}
              className="rounded-lg bg-stone-100 border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-200"
            >
              Imprimir listado
            </button>
            <button
              type="button"
              onClick={() => void loadRows()}
              disabled={loading}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
            >
              {loading ? (
                <LoadingInline
                  label="Actualizando..."
                  size="xs"
                  tone="dark"
                  textClassName="text-xs font-semibold text-stone-700"
                />
              ) : (
                "Actualizar"
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:equipos-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por destino, equipo, fecha, responsable u observaciones"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <p className="text-xs font-semibold text-stone-600">Mostrando {sortedRows.length} de {rows.length}</p>
        </div>

        {error ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

        {loading && rows.length === 0 ? (
          <LoadingInline
            label="Cargando asignaciones a recintos..."
            className="mt-3"
            textClassName="text-sm font-medium text-stone-600"
          />
        ) : null}

        {!loading && !error && sortedRows.length === 0 ? (
          <p className="mt-3 text-xs text-stone-600">No hay asignaciones para mostrar con el filtro actual.</p>
        ) : null}
      </article>

      {sortedRows.length > 0 ? (
        <article className="ej-card rounded-2xl p-4">
          <div className="overflow-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[1060px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Fecha</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Tipo</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Clase</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Destino (Recinto/Externo)</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Equipo</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Cantidad</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Autor</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Observaciones</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr key={`${row.movimientoId}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-mono text-stone-800 align-top">{row.fecha}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900 align-top">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        row.tipo === "ENTREGA" ? "bg-emerald-100 text-emerald-800" :
                        row.tipo === "DEVOLUCION" ? "bg-amber-100 text-amber-800" :
                        row.tipo === "ASIGNACION" ? "bg-violet-100 text-violet-800" :
                        "bg-stone-100 text-stone-800"
                      }`}>
                        {row.tipo}
                      </span>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-xs font-semibold uppercase text-stone-500 align-top">{row.clase}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-bold text-stone-900 align-top">{row.nombre}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800 align-top">
                      <div className="flex flex-col gap-1">
                        {(row.equipos || []).map((i, idx) => (
                          <span key={idx} className="block">{i.equipo}</span>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-bold text-stone-900 align-top">
                      <div className="flex flex-col gap-1">
                        {(row.equipos || []).map((i, idx) => (
                          <span key={idx} className="block">{i.cantidad}</span>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-xs text-stone-600 align-top">{row.usuarioEntrega || "-"}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-700 align-top max-w-[200px] truncate" title={row.observaciones || ""}>
                      {row.observaciones || "-"}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-right align-top">
                      <div className="inline-flex equipos-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailRow(row)}
                          disabled={loading}
                          className="inline-flex rounded p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors disabled:opacity-50"
                          title="Ver detalle de la asignación"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(`/api/registros/${encodeURIComponent(row.movimientoId)}/recibo`, "_blank", "noopener,noreferrer")}
                          disabled={loading}
                          className="inline-flex rounded p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors disabled:opacity-50"
                          title="Imprimir recibo/constancia"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => onRectifyRegistro(row.movimientoId)}
                            disabled={loading}
                            className="inline-flex rounded p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-700 transition-colors disabled:opacity-50"
                            title="Editar / Rectificar asignación"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => onDeleteRegistro(row.movimientoId, row.fecha, row.nombre, () => void loadRows())}
                            disabled={loading}
                            className="inline-flex rounded p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                            title="Eliminar asignación"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {generatedAt ? <p className="mt-3 text-xs text-stone-500">Generado: {formatDateTimeForDisplay(generatedAt)}</p> : null}
        </article>
      ) : null}

      {detailRow ? (
        <ModalFrame onClose={() => setDetailRow(null)} size="md">
          <div className="p-1">
            <h3 className="text-lg font-bold text-stone-900 mb-4">
              Detalle de {detailRow.tipo === "ASIGNACION" ? "Asignación" : detailRow.tipo === "ENTREGA" ? "Entrega" : "Devolución"}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">ID Movimiento</p>
                  <p className="mt-1 text-sm font-mono text-stone-800 break-all">{detailRow.movimientoId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Fecha</p>
                  <p className="mt-1 text-sm font-medium text-stone-900">{detailRow.fecha}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Destino ({detailRow.clase})</p>
                <p className="mt-1 text-sm font-bold text-stone-900">{detailRow.nombre}</p>
              </div>

              {detailRow.responsableInfo ? (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Responsable a cargo</p>
                  <p className="mt-1 text-sm font-medium text-stone-800">
                    {detailRow.responsableInfo.grado} {detailRow.responsableInfo.nombre} {detailRow.responsableInfo.apellido}
                    {detailRow.responsableInfo.ci && !detailRow.responsableInfo.ci.startsWith("SD-") ? (
                      <span className="text-stone-500 font-normal ml-1">
                        (CI: {detailRow.responsableInfo.ci})
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Equipos</p>
                <div className="mt-2 rounded-lg border border-stone-200 divide-y divide-stone-100">
                  {(detailRow.equipos || []).map((i, idx) => (
                    <div key={idx} className="flex justify-between equipos-center p-3 bg-stone-50/50">
                      <span className="text-sm font-medium text-stone-800">{i.equipo}</span>
                      <span className="text-sm font-bold text-stone-900 bg-white border border-stone-200 px-2 py-0.5 rounded shadow-sm">x{i.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Autor</p>
                  <p className="mt-1 text-sm text-stone-800">{detailRow.usuarioEntrega || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Observaciones</p>
                  <p className="mt-1 text-sm text-stone-800">{detailRow.observaciones || "-"}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.open(`/api/registros/${encodeURIComponent(detailRow.movimientoId)}/recibo`, "_blank", "noopener,noreferrer")}
                className="rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-800 transition-colors flex equipos-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}
