"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingInline } from "@/app/components/shared";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import {
  DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT,
  sortMovimientosFueraHojaRows,
  type MovimientosFueraHojaSortDirection,
  type MovimientosFueraHojaSortField,
} from "@/lib/movimientos-fuera-hoja-sort";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { MovimientoFueraHojaViewRow } from "@/types/views";

type MovimientosFueraHojaResponse = {
  generatedAt: string;
  total: number;
  rows: MovimientoFueraHojaViewRow[];
};

type MovimientosFueraHojaViewProps = {
  canWrite: boolean;
  onOpenRegistro: (
    ci: string,
    tipo: "ENTREGA" | "DEVOLUCION",
    options?: { incluirFueraDeHoja?: boolean }
  ) => void;
};

export function MovimientosFueraHojaView({
  canWrite,
  onOpenRegistro,
}: MovimientosFueraHojaViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [rows, setRows] = useState<MovimientoFueraHojaViewRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<MovimientosFueraHojaSortField>(
    DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT.field
  );
  const [sortDirection, setSortDirection] = useState<MovimientosFueraHojaSortDirection>(
    DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT.direction
  );

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/hojas-de-entrega/movimientos-fuera-hoja?ts=${Date.now()}`,
        {
          cache: "no-store",
        }
      );
      const payload = (await response.json()) as MovimientosFueraHojaResponse | { error?: string };
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "error" in payload
            ? payload.error || "Error"
            : "Error"
        );
      }

      const data = payload as MovimientosFueraHojaResponse;
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
        text: (row) =>
          [
            row.fecha,
            row.tipo,
            row.ci,
            row.gradoAbreviacion,
            row.persona,
            row.equipo,
            row.observaciones || "",
          ].join(" "),
      }),
    [rows]
  );
  const filteredRows = useMemo(() => {
    return filterSearchIndex(rowSearchIndex, search);
  }, [rowSearchIndex, search]);
  const sortedRows = useMemo(() => {
    return sortMovimientosFueraHojaRows(filteredRows, {
      field: sortField,
      direction: sortDirection,
    });
  }, [filteredRows, sortField, sortDirection]);

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Movimientos fuera de hoja de entrega
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              Listado global de movimientos de equipos no incluidos en la hoja de entrega principal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenRegistro("", "ENTREGA", { incluirFueraDeHoja: true })}
                  disabled={loading}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                >
                  Registrar Entrega
                </button>
                <button
                  type="button"
                  onClick={() => onOpenRegistro("", "DEVOLUCION", { incluirFueraDeHoja: true })}
                  disabled={loading}
                  className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-60"
                >
                  Registrar Devolución
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams();
                params.set("sortBy", sortField);
                params.set("sortDirection", sortDirection);
                const url = `/api/hojas-de-entrega/movimientos-fuera-hoja/pdf?${params.toString()}`;
                window.open(url, "_blank");
              }}
              disabled={loading || sortedRows.length === 0}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
            >
              Imprimir PDF
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

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por CI, persona, equipo, fecha u observaciones"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <p className="text-xs font-semibold text-stone-600">
            Mostrando {sortedRows.length} de {rows.length}
          </p>
        </div>

        <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,220px)_1fr] md:items-center">
          <label className="text-xs text-stone-700">
            Ordenar por
            <select
              value={sortField}
              onChange={(event) =>
                setSortField(event.target.value as MovimientosFueraHojaSortField)
              }
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="fecha">Fecha</option>
              <option value="equipo">Equipo (alfabético)</option>
              <option value="grado">Grado del personal</option>
            </select>
          </label>

          <label className="text-xs text-stone-700">
            Dirección
            <select
              value={sortDirection}
              onChange={(event) =>
                setSortDirection(event.target.value as MovimientosFueraHojaSortDirection)
              }
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </label>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        {loading && rows.length === 0 ? (
          <LoadingInline
            label="Cargando movimientos fuera de hoja..."
            className="mt-3"
            textClassName="text-sm font-medium text-stone-600"
          />
        ) : null}

        {!loading && !error && sortedRows.length === 0 ? (
          <p className="mt-3 text-xs text-stone-600">
            No hay movimientos para mostrar con el filtro actual.
          </p>
        ) : null}
      </article>

      {sortedRows.length > 0 ? (
        <article className="ej-card rounded-2xl p-4">
          <div className="overflow-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[1060px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Fecha
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Tipo
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    CI
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Grado
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Persona
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Equipo
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Cantidad
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Observaciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr
                    key={`${row.movimientoId}-${row.equipo}-${index}`}
                    className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}
                  >
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">
                      {row.fecha}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">
                      {row.tipo}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">
                      {row.ci}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">
                      {row.gradoAbreviacion}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">
                      {row.persona}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">
                      {row.equipo}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">
                      {row.cantidad}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-700">
                      {row.observaciones || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {generatedAt ? (
            <p className="mt-3 text-xs text-stone-500">
              Generado: {formatDateTimeForDisplay(generatedAt)}
            </p>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
