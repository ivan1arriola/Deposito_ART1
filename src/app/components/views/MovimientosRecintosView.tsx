"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingInline } from "@/app/components/shared";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { MovimientoRecintoViewRow } from "@/types/views";

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
};

export function MovimientosRecintosView({ canWrite, canDelete, onOpenRegistro, onDeleteRegistro }: MovimientosRecintosViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [rows, setRows] = useState<MovimientoRecintoViewRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
        text: (row) => [row.fecha, row.tipo, row.clase, row.nombre, row.item, row.observaciones || "", row.usuarioEntrega || ""].join(" "),
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
        <div className="flex flex-wrap items-start justify-between gap-3">
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

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
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
                  <tr key={`${row.movimientoId}-${row.item}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-mono text-stone-800">{row.fecha}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        row.tipo === "ENTREGA" ? "bg-emerald-100 text-emerald-800" :
                        row.tipo === "DEVOLUCION" ? "bg-amber-100 text-amber-800" :
                        row.tipo === "ASIGNACION" ? "bg-violet-100 text-violet-800" :
                        "bg-stone-100 text-stone-800"
                      }`}>
                        {row.tipo}
                      </span>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-xs font-semibold uppercase text-stone-500">{row.clase}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-bold text-stone-900">{row.nombre}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.item}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-bold text-stone-900">{row.cantidad}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-xs text-stone-600">{row.usuarioEntrega || "-"}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-700">{row.observaciones || "-"}</td>
                    <td className="border-b border-stone-200 px-3 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
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
    </section>
  );
}
