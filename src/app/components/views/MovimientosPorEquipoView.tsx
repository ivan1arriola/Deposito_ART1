"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingInline } from "@/app/components/shared";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import {
  DEFAULT_MOVIMIENTOS_EQUIPO_SORT,
  sortMovimientosEquipoRows,
  type MovimientosEquipoSortDirection,
  type MovimientosEquipoSortField,
} from "@/lib/movimientos-equipo-sort";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { EquipoMovimientoCatalogItem, EquipoMovimientoViewRow } from "@/types/views";

type MovimientosEquipoResponse = {
  generatedAt: string;
  total: number;
  items: EquipoMovimientoCatalogItem[];
  selectedItem: EquipoMovimientoCatalogItem | null;
  rows: EquipoMovimientoViewRow[];
};

function tipoBadgeClass(tipo: EquipoMovimientoViewRow["tipo"]) {
  if (tipo === "ENTREGA") return "bg-emerald-100 text-emerald-800";
  if (tipo === "DEVOLUCION") return "bg-sky-100 text-sky-800";
  return "bg-amber-100 text-amber-800";
}

export function MovimientosPorEquipoView() {
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [items, setItems] = useState<EquipoMovimientoCatalogItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");

  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<EquipoMovimientoCatalogItem | null>(null);
  const [rows, setRows] = useState<EquipoMovimientoViewRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<MovimientosEquipoSortField>(DEFAULT_MOVIMIENTOS_EQUIPO_SORT.field);
  const [sortDirection, setSortDirection] = useState<MovimientosEquipoSortDirection>(DEFAULT_MOVIMIENTOS_EQUIPO_SORT.direction);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);

    try {
      const response = await fetch(`/api/items/movimientos?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as MovimientosEquipoResponse | { error?: string };
      if (!response.ok) {
        throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Error" : "Error");
      }

      const data = payload as MovimientosEquipoResponse;
      setItems(data.items);
    } catch (nextError: unknown) {
      setCatalogError(nextError instanceof Error ? nextError.message : "No se pudo cargar el menú de equipos.");
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadRows = async (itemId: string) => {
    setRowsLoading(true);
    setRowsError(null);

    try {
      const params = new URLSearchParams({
        itemId,
        sortBy: sortField,
        sortDirection,
        ts: String(Date.now()),
      });
      const response = await fetch(`/api/items/movimientos?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as MovimientosEquipoResponse | { error?: string };
      if (!response.ok) {
        throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Error" : "Error");
      }

      const data = payload as MovimientosEquipoResponse;
      setRows(data.rows);
      setGeneratedAt(data.generatedAt);
      setActiveItem(data.selectedItem);
      setSearch("");
    } catch (nextError: unknown) {
      setRowsError(nextError instanceof Error ? nextError.message : "No se pudo cargar los movimientos del equipo.");
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  const rowSearchIndex = useMemo(
    () =>
      buildSearchIndex(rows, {
        text: (row) => [row.fecha, row.tipoLabel, row.movimientoId, row.ci, row.gradoAbreviacion, row.persona, row.observaciones || ""].join(" "),
      }),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return filterSearchIndex(rowSearchIndex, search);
  }, [rowSearchIndex, search]);

  const sortedRows = useMemo(() => {
    return sortMovimientosEquipoRows(filteredRows, { field: sortField, direction: sortDirection });
  }, [filteredRows, sortField, sortDirection]);

  const selectedOption = useMemo(
    () => items.find((item) => item.itemId === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  return (
    <section className="mt-6 space-y-4">
      {!activeItem ? (
        <article className="ej-card rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Movimientos por equipo</h2>
              <p className="mt-1 text-xs text-stone-600">
                Paso 1: elegí un solo equipo para ver todos sus movimientos, tanto si figura en hoja de entrega como si no.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              disabled={catalogLoading}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
            >
              {catalogLoading ? (
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

          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-xs text-stone-700">
              Equipo
              <select
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                disabled={catalogLoading || items.length === 0}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Seleccionar equipo</option>
                {items.map((item) => (
                  <option key={item.itemId} value={item.itemId}>
                    {item.activo ? item.nombre : `${item.nombre} (fuera de hoja)`}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!selectedItemId || catalogLoading}
              onClick={() => {
                if (!selectedItemId) return;
                void loadRows(selectedItemId);
              }}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              Ver movimientos
            </button>
          </div>

          {selectedOption ? (
            <p className="mt-2 text-xs text-stone-500">
              Estado: {selectedOption.activo ? "Equipo visible en hoja de entrega" : "Equipo fuera de hoja de entrega"}
            </p>
          ) : null}

          {catalogError ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{catalogError}</p> : null}

          {!catalogLoading && items.length === 0 ? (
            <p className="mt-3 text-xs text-stone-600">No hay equipos registrados para mostrar.</p>
          ) : null}
        </article>
      ) : null}

      {activeItem ? (
        <>
          <article className="ej-card rounded-2xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Movimientos del equipo seleccionado</h2>
                <p className="mt-1 text-xs text-stone-600">Paso 2: listado completo de movimientos por equipo, etiquetados por tipo.</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{activeItem.nombre}</p>
                <p className="text-xs text-stone-500">
                  {activeItem.activo ? "Visible en hoja de entrega" : "Fuera de hoja de entrega"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      itemId: activeItem.itemId,
                      sortBy: sortField,
                      sortDirection,
                    });
                    window.open(`/api/items/movimientos/pdf?${params.toString()}`, "_blank");
                  }}
                  disabled={rowsLoading || sortedRows.length === 0}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  Imprimir PDF
                </button>
                <button
                  type="button"
                  onClick={() => void loadRows(activeItem.itemId)}
                  disabled={rowsLoading}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  {rowsLoading ? (
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
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(null);
                    setRows([]);
                    setRowsError(null);
                    setGeneratedAt(null);
                  }}
                  className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-900"
                >
                  Cambiar equipo
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_minmax(0,220px)] md:items-end">
              <label className="text-xs text-stone-700">
                Buscar
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por fecha, tipo, CI, persona u observaciones"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="text-xs text-stone-700">
                Ordenar por
                <select
                  value={sortField}
                  onChange={(event) => setSortField(event.target.value as MovimientosEquipoSortField)}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="fecha">Fecha</option>
                  <option value="tipo">Tipo</option>
                </select>
              </label>

              <label className="text-xs text-stone-700">
                Dirección
                <select
                  value={sortDirection}
                  onChange={(event) => setSortDirection(event.target.value as MovimientosEquipoSortDirection)}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </label>
            </div>

            <p className="mt-2 text-xs font-semibold text-stone-600">Mostrando {sortedRows.length} de {rows.length}</p>

            {rowsError ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{rowsError}</p> : null}

            {rowsLoading && rows.length === 0 ? (
              <LoadingInline
                label="Cargando movimientos del equipo..."
                className="mt-3"
                textClassName="text-sm font-medium text-stone-600"
              />
            ) : null}

            {!rowsLoading && !rowsError && sortedRows.length === 0 ? (
              <p className="mt-3 text-xs text-stone-600">No hay movimientos para mostrar con el filtro actual.</p>
            ) : null}
          </article>

          {sortedRows.length > 0 ? (
            <article className="ej-card rounded-2xl p-4">
              <div className="overflow-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Fecha</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Tipo</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Mov.</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">CI</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Grado</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Persona</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Cantidad</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => (
                      <tr key={`${row.movimientoId}-${row.ci}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.fecha}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-900">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tipoBadgeClass(row.tipo)}`}>
                            {row.tipoLabel}
                          </span>
                        </td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.movimientoId}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.ci}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.gradoAbreviacion}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.persona}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.cantidad}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-700">{row.observaciones || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {generatedAt ? <p className="mt-3 text-xs text-stone-500">Generado: {formatDateTimeForDisplay(generatedAt)}</p> : null}
            </article>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
