"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingInline } from "@/app/components/shared";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import {
  applyMovimientosEquipoTipoFilters,
  DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS,
  serializeMovimientosEquipoTipoFilters,
  type MovimientosEquipoTipoFilter,
} from "@/lib/movimientos-equipo-filters";
import {
  DEFAULT_MOVIMIENTOS_EQUIPO_SORT,
  sortMovimientosEquipoRows,
  type MovimientosEquipoSortDirection,
  type MovimientosEquipoSortField,
} from "@/lib/movimientos-equipo-sort";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { EquipoMovimientoCatalogEquipo, EquipoMovimientoViewRow, PrestamoStockEntry } from "@/types/views";

type MovimientosEquipoResponse = {
  generatedAt: string;
  total: number;
  equipos: EquipoMovimientoCatalogEquipo[];
  selectedItem: EquipoMovimientoCatalogEquipo | null;
  rows: EquipoMovimientoViewRow[];
};

type RegistroMovimientoDetail = {
  registroId: string;
  fecha: string;
  tipo: "ENTREGA" | "DEVOLUCION" | "ASIGNACION";
  comentarios: string | null;
  destinatarioTipo: "PERSONAL" | "RECINTO" | "EXTERNO";
  recintoClase: string | null;
  recintoNombre: string | null;
  ci: string;
  perfilCi: string | null;
  persona: string;
  bateria: string | null;
  usuarioEntregaId: string;
  usuarioEntregaNombre: string;
  equipos: Array<{
    equipoId: string;
    nombre: string;
    cantidad: number;
  }>;
};

type OrigenDialogState =
  | { kind: "PRESTAMO"; prestamo: PrestamoStockEntry }
  | { kind: "REGISTRO"; registro: RegistroMovimientoDetail };

type CatalogHojaFilter = "TODOS" | "EN_HOJA" | "FUERA_HOJA";

const MOVIMIENTOS_EQUIPO_TIPO_OPTIONS: Array<{ value: MovimientosEquipoTipoFilter; label: string; hint: string }> = [
  { value: "ENTREGA", label: "Entregas", hint: "Movimientos de entrega" },
  { value: "DEVOLUCION", label: "Devoluciones", hint: "Movimientos de devolución" },
  { value: "ASIGNACION", label: "Asignaciones", hint: "Movimientos de asignación" },
  { value: "PRESTAMO_PENDIENTE", label: "Préstamos pendientes", hint: "Solo préstamos en estado pendiente" },
];

const CATALOG_HOJA_FILTER_OPTIONS: Array<{ value: CatalogHojaFilter; label: string; hint: string }> = [
  { value: "TODOS", label: "Ambas", hint: "Equipos visibles y fuera de hoja de entrega" },
  { value: "EN_HOJA", label: "En hoja", hint: "Solo equipos visibles en hoja de entrega" },
  { value: "FUERA_HOJA", label: "Fuera de hoja", hint: "Solo equipos que no figuran en hoja de entrega" },
];

function tipoBadgeClass(tipo: EquipoMovimientoViewRow["tipo"]) {
  if (tipo === "ENTREGA") return "bg-emerald-100 text-emerald-800";
  if (tipo === "DEVOLUCION") return "bg-sky-100 text-sky-800";
  if (tipo === "ASIGNACION") return "bg-indigo-100 text-indigo-800";
  return "bg-amber-100 text-amber-800";
}

type MovimientosPorEquipoViewProps = {
  onOpenPersonaProfileByCi?: (ci: string) => Promise<boolean> | boolean;
};

export function MovimientosPorEquipoView({ onOpenPersonaProfileByCi }: MovimientosPorEquipoViewProps = {}) {
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [equipos, setItems] = useState<EquipoMovimientoCatalogEquipo[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogHojaFilter, setCatalogHojaFilter] = useState<CatalogHojaFilter>("TODOS");

  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<EquipoMovimientoCatalogEquipo | null>(null);
  const [rows, setRows] = useState<EquipoMovimientoViewRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<MovimientosEquipoSortField>(DEFAULT_MOVIMIENTOS_EQUIPO_SORT.field);
  const [sortDirection, setSortDirection] = useState<MovimientosEquipoSortDirection>(DEFAULT_MOVIMIENTOS_EQUIPO_SORT.direction);
  const [tipoFilters, setTipoFilters] = useState<MovimientosEquipoTipoFilter[]>([...DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS]);
  const [originDialog, setOriginDialog] = useState<OrigenDialogState | null>(null);
  const [originLoadingKey, setOriginLoadingKey] = useState<string | null>(null);
  const [originError, setOriginError] = useState<string | null>(null);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    setCatalogError(null);

    try {
      const response = await fetch(`/api/equipos/movimientos?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as MovimientosEquipoResponse | { error?: string };
      if (!response.ok) {
        throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Error" : "Error");
      }

      const data = payload as MovimientosEquipoResponse;
      setItems(data.equipos);
    } catch (nextError: unknown) {
      setCatalogError(nextError instanceof Error ? nextError.message : "No se pudo cargar el menú de equipos.");
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadRows = async (equipoId: string) => {
    setRowsLoading(true);
    setRowsError(null);

    try {
      const params = new URLSearchParams({
        equipoId,
        sortBy: sortField,
        sortDirection,
        tipos: serializeMovimientosEquipoTipoFilters(DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS),
        ts: String(Date.now()),
      });
      const response = await fetch(`/api/equipos/movimientos?${params.toString()}`, {
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

  const catalogByHojaItems = useMemo(() => {
    if (catalogHojaFilter === "EN_HOJA") return equipos.filter((equipo) => equipo.activo);
    if (catalogHojaFilter === "FUERA_HOJA") return equipos.filter((equipo) => !equipo.activo);
    return equipos;
  }, [equipos, catalogHojaFilter]);

  const catalogSearchIndex = useMemo(
    () =>
      buildSearchIndex(catalogByHojaItems, {
        text: (equipo) => [equipo.equipoId, equipo.nombre, equipo.activo ? "activo en hoja" : "fuera de hoja"].join(" "),
      }),
    [catalogByHojaItems],
  );

  const filteredCatalogItems = useMemo(() => {
    return filterSearchIndex(catalogSearchIndex, catalogSearch);
  }, [catalogSearchIndex, catalogSearch]);

  const rowsAfterTipoFilter = useMemo(() => {
    return applyMovimientosEquipoTipoFilters(rows, tipoFilters);
  }, [rows, tipoFilters]);

  const rowSearchIndex = useMemo(
    () =>
      buildSearchIndex(rowsAfterTipoFilter, {
        text: (row) => [row.fecha, row.tipoLabel, row.movimientoId, row.ci, row.gradoAbreviacion, row.persona, row.observaciones || ""].join(" "),
      }),
    [rowsAfterTipoFilter],
  );

  const filteredRows = useMemo(() => {
    return filterSearchIndex(rowSearchIndex, search);
  }, [rowSearchIndex, search]);

  const sortedRows = useMemo(() => {
    return sortMovimientosEquipoRows(filteredRows, { field: sortField, direction: sortDirection });
  }, [filteredRows, sortField, sortDirection]);

  function toggleTipoFilter(filter: MovimientosEquipoTipoFilter) {
    setTipoFilters((prev) => (prev.includes(filter) ? prev.filter((value) => value !== filter) : [...prev, filter]));
  }

  async function openPersonaProfile(ci: string) {
    const ciValue = ci.trim();
    if (!ciValue) return;

    if (!onOpenPersonaProfileByCi) {
      window.open(
        `/api/hoja-de-entrega/${encodeURIComponent(ciValue)}/pdf?inline=1&ts=${Date.now()}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    const opened = await onOpenPersonaProfileByCi(ciValue);
    if (!opened) {
      setOriginError(`No se encontró la ficha completa para la CI ${ciValue}.`);
      return;
    }

    setOriginDialog(null);
  }

  async function openOriginDetail(row: EquipoMovimientoViewRow) {
    const loadingKey = `${row.movimientoId}-${row.tipo}`;
    setOriginLoadingKey(loadingKey);
    setOriginError(null);
    try {
      if (row.tipo === "PRESTAMO") {
        const response = await fetch(`/api/prestamos/${encodeURIComponent(row.movimientoId)}?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as PrestamoStockEntry | { error?: string };
        if (!response.ok) {
          throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Error" : "Error");
        }
        setOriginDialog({ kind: "PRESTAMO", prestamo: payload as PrestamoStockEntry });
        return;
      }

      const response = await fetch(`/api/registros/${encodeURIComponent(row.movimientoId)}?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as RegistroMovimientoDetail | { error?: string };
      if (!response.ok) {
        throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Error" : "Error");
      }
      setOriginDialog({ kind: "REGISTRO", registro: payload as RegistroMovimientoDetail });
    } catch (error: unknown) {
      setOriginError(error instanceof Error ? error.message : "No se pudo cargar el detalle de origen.");
    } finally {
      setOriginLoadingKey((current) => (current === loadingKey ? null : current));
    }
  }

  return (
    <section className="mt-6 space-y-4">
      {!activeItem ? (
        <article className="ej-card min-h-[calc(100dvh-11.5rem)] rounded-2xl p-4 flex flex-col">
          <div className="flex flex-wrap equipos-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Movimientos por equipo</h2>
              <p className="mt-1 text-sm text-stone-600">
                Paso 1: elegí un solo equipo para ver todos sus movimientos, tanto si figura en hoja de entrega como si no.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadCatalog()}
              disabled={catalogLoading}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
            >
              {catalogLoading ? (
                <LoadingInline
                  label="Actualizando..."
                  size="xs"
                  tone="dark"
                  textClassName="text-sm font-semibold text-stone-700"
                />
              ) : (
                "Actualizar"
              )}
            </button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:equipos-end">
            <label className="text-sm text-stone-700">
              Buscar equipo
              <input
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Buscar por nombre o ID de equipo"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
              />
            </label>
            <p className="text-sm text-stone-500 md:text-right">{`${filteredCatalogItems.length} de ${catalogByHojaItems.length} equipos`}</p>
          </div>

          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">Filtro por hoja de entrega</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATALOG_HOJA_FILTER_OPTIONS.map((option) => {
                const enabled = catalogHojaFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCatalogHojaFilter(option.value)}
                    className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                      enabled
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                    }`}
                    title={option.hint}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-stone-200 bg-white">
            {filteredCatalogItems.length === 0 ? (
              <p className="p-3 text-sm text-stone-600">No hay equipos que coincidan con la búsqueda.</p>
            ) : (
              <ul className="divide-y divide-stone-200">
                {filteredCatalogItems.map((equipo, index) => (
                  <li
                    key={equipo.equipoId}
                    className={`flex flex-wrap equipos-center justify-between gap-2 px-3 py-2 ${
                      index % 2 === 0 ? "bg-white" : "bg-stone-50/70"
                    }`}
                  >
                    <div>
                      <p className="text-base font-semibold text-stone-900">{equipo.nombre}</p>
                      <p className="text-sm text-stone-500">
                        {`ID ${equipo.equipoId} | ${equipo.activo ? "Visible en hoja de entrega" : "Fuera de hoja de entrega"}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemId(equipo.equipoId);
                        void loadRows(equipo.equipoId);
                      }}
                      disabled={catalogLoading || rowsLoading}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {rowsLoading && selectedItemId === equipo.equipoId ? "Cargando..." : "Ver"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {catalogError ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{catalogError}</p> : null}

          {!catalogLoading && equipos.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No hay equipos registrados para mostrar.</p>
          ) : null}
        </article>
      ) : null}

      {activeItem ? (
        <>
          <article className="ej-card rounded-2xl p-4">
            <div className="flex flex-wrap equipos-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Movimientos del equipo seleccionado</h2>
                <p className="mt-1 text-sm text-stone-600">Paso 2: listado completo de movimientos por equipo, etiquetados por tipo.</p>
                <p className="mt-1 text-base font-semibold text-stone-900">{activeItem.nombre}</p>
                <p className="text-sm text-stone-500">
                  {activeItem.activo ? "Visible en hoja de entrega" : "Fuera de hoja de entrega"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      equipoId: activeItem.equipoId,
                      sortBy: sortField,
                      sortDirection,
                      tipos: serializeMovimientosEquipoTipoFilters(tipoFilters),
                    });
                    window.open(`/api/equipos/movimientos/pdf?${params.toString()}`, "_blank");
                  }}
                  disabled={rowsLoading || sortedRows.length === 0}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  Imprimir PDF
                </button>
                <button
                  type="button"
                  onClick={() => void loadRows(activeItem.equipoId)}
                  disabled={rowsLoading}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  {rowsLoading ? (
                    <LoadingInline
                      label="Actualizando..."
                      size="xs"
                      tone="dark"
                      textClassName="text-sm font-semibold text-stone-700"
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
                  className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-900"
                >
                  Cambiar equipo
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_minmax(0,220px)] md:equipos-end">
              <label className="text-sm text-stone-700">
                Buscar
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por fecha, tipo, CI, persona u observaciones"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
                />
              </label>

              <label className="text-sm text-stone-700">
                Ordenar por
                <select
                  value={sortField}
                  onChange={(event) => setSortField(event.target.value as MovimientosEquipoSortField)}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
                >
                  <option value="fecha">Fecha</option>
                  <option value="tipo">Tipo</option>
                </select>
              </label>

              <label className="text-sm text-stone-700">
                Dirección
                <select
                  value={sortDirection}
                  onChange={(event) => setSortDirection(event.target.value as MovimientosEquipoSortDirection)}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base"
                >
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">Filtros por tipo de movimiento</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {MOVIMIENTOS_EQUIPO_TIPO_OPTIONS.map((option) => {
                  const enabled = tipoFilters.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleTipoFilter(option.value)}
                      className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                        enabled
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                      }`}
                      title={option.hint}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-stone-500">Los préstamos se muestran únicamente si están pendientes.</p>
            </div>

            <p className="mt-2 text-sm font-semibold text-stone-600">
              Mostrando {sortedRows.length} de {rowsAfterTipoFilter.length} movimientos según los filtros de tipo
            </p>

            {originError ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{originError}</p> : null}
            {rowsError ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{rowsError}</p> : null}

            {rowsLoading && rows.length === 0 ? (
              <LoadingInline
                label="Cargando movimientos del equipo..."
                className="mt-3"
                textClassName="text-sm font-medium text-stone-600"
              />
            ) : null}

            {!rowsLoading && !rowsError && sortedRows.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">No hay movimientos para mostrar con el filtro actual.</p>
            ) : null}
          </article>

          {sortedRows.length > 0 ? (
            <article className="ej-card rounded-2xl p-4">
              <div className="overflow-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Fecha</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Tipo</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Mov.</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">CI</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Grado</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Persona</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Cantidad</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Observaciones</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-stone-600">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => (
                      <tr key={`${row.movimientoId}-${row.ci}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.fecha}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-900">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-sm font-semibold ${tipoBadgeClass(row.tipo)}`}>
                            {row.tipoLabel}
                          </span>
                        </td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.movimientoId}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">
                          {row.perfilCi ? (
                            <button
                              type="button"
                              onClick={() => void openPersonaProfile(row.perfilCi!)}
                              className="font-mono text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
                              title="Ver ficha completa"
                            >
                              {row.ci || "-"}
                            </button>
                          ) : (
                            <span className="font-mono">{row.ci || "-"}</span>
                          )}
                        </td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.gradoAbreviacion}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">{row.persona}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.cantidad}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-700">{row.observaciones || "-"}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-800">
                          <button
                            type="button"
                            onClick={() => void openOriginDetail(row)}
                            disabled={originLoadingKey === `${row.movimientoId}-${row.tipo}`}
                            className="rounded border border-stone-300 bg-white px-2 py-1 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                          >
                            {originLoadingKey === `${row.movimientoId}-${row.tipo}`
                              ? "Cargando..."
                              : row.tipo === "PRESTAMO"
                                ? "Ver préstamo"
                                : "Ver movimiento"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {generatedAt ? <p className="mt-3 text-sm text-stone-500">Generado: {formatDateTimeForDisplay(generatedAt)}</p> : null}
            </article>
          ) : null}

          {originDialog ? (
            <ModalFrame onClose={() => setOriginDialog(null)} size="lg">
              <div className="space-y-4">
                {originDialog.kind === "PRESTAMO" ? (
                  <>
                    <header>
                      <h3 className="text-lg font-semibold text-stone-900">Detalle del préstamo #{originDialog.prestamo.prestamoId}</h3>
                      <p className="text-sm text-stone-600">{originDialog.prestamo.reciboNumero}</p>
                    </header>
                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 md:grid-cols-2">
                      <p><span className="font-semibold text-stone-900">Estado:</span> {originDialog.prestamo.estado}</p>
                      <p><span className="font-semibold text-stone-900">Fecha préstamo:</span> {originDialog.prestamo.fechaPrestamo}</p>
                      <p><span className="font-semibold text-stone-900">Clase:</span> {originDialog.prestamo.clasePrestamo}</p>
                      <p><span className="font-semibold text-stone-900">Destinatario:</span> {originDialog.prestamo.destinatarioEtiqueta}</p>
                      <p>
                        <span className="font-semibold text-stone-900">CI:</span>{" "}
                        {originDialog.prestamo.perfilCi ? (
                          <button
                            type="button"
                            onClick={() => void openPersonaProfile(originDialog.prestamo.perfilCi!)}
                            className="font-mono text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
                          >
                            {originDialog.prestamo.destinatarioCi ?? "-"}
                          </button>
                        ) : (
                          <span className="font-mono">{originDialog.prestamo.destinatarioCi ?? "Pendiente"}</span>
                        )}
                      </p>
                      {originDialog.prestamo.destinatarioUnidadDestino ? (
                        <p><span className="font-semibold text-stone-900">Unidad destino:</span> {originDialog.prestamo.destinatarioUnidadDestino}</p>
                      ) : null}
                      {originDialog.prestamo.fechaEstimadaDevolucionTexto ? (
                        <p><span className="font-semibold text-stone-900">Estimado:</span> {originDialog.prestamo.fechaEstimadaDevolucionTexto}</p>
                      ) : null}
                      {originDialog.prestamo.fechaDevolucion ? (
                        <p><span className="font-semibold text-stone-900">Fecha devolución:</span> {originDialog.prestamo.fechaDevolucion}</p>
                      ) : null}
                    </div>
                    {originDialog.prestamo.comentarios ? (
                      <p className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-base text-stone-700">
                        <span className="font-semibold text-stone-900">Comentarios:</span> {originDialog.prestamo.comentarios}
                      </p>
                    ) : null}
                    <section className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">Equipos del préstamo</p>
                      {originDialog.prestamo.equipos.map((equipo, index) => (
                        <div
                          key={`${originDialog.prestamo.prestamoId}-${equipo.equipoId}`}
                          className={`rounded-lg border border-stone-200 px-3 py-2 ${
                            index % 2 === 0 ? "bg-white" : "bg-stone-50/70"
                          }`}
                        >
                          <p className="text-base text-stone-900">
                            <span className="font-semibold">{equipo.cantidad}</span> {equipo.nombre}
                          </p>
                          <p className="text-sm text-stone-600">
                            Entrega: {equipo.estadoEntrega}
                            {equipo.comentarioEntrega ? ` | ${equipo.comentarioEntrega}` : ""}
                          </p>
                          {equipo.estadoDevolucion ? (
                            <p className="text-sm text-stone-600">
                              Devolución: {equipo.estadoDevolucion}
                              {equipo.comentarioDevolucion ? ` | ${equipo.comentarioDevolucion}` : ""}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </section>
                    <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3">
                      <button
                        type="button"
                        onClick={() => window.open(`/api/prestamos/${encodeURIComponent(originDialog.prestamo.prestamoId)}/recibo`, "_blank")}
                        className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
                      >
                        Abrir recibo
                      </button>
                      <button
                        type="button"
                        onClick={() => setOriginDialog(null)}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Cerrar
                      </button>
                    </footer>
                  </>
                ) : (
                  <>
                    <header>
                      <h3 className="text-lg font-semibold text-stone-900">Detalle del movimiento #{originDialog.registro.registroId}</h3>
                      <p className="text-sm text-stone-600">{originDialog.registro.tipo} | {originDialog.registro.fecha}</p>
                    </header>
                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 md:grid-cols-2">
                      <p><span className="font-semibold text-stone-900">Destinatario:</span> {originDialog.registro.persona}</p>
                      {originDialog.registro.destinatarioTipo === "PERSONAL" ? (
                        <p>
                          <span className="font-semibold text-stone-900">CI:</span>{" "}
                          {originDialog.registro.perfilCi ? (
                            <button
                              type="button"
                              onClick={() => void openPersonaProfile(originDialog.registro.perfilCi!)}
                              className="font-mono text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
                            >
                              {originDialog.registro.ci}
                            </button>
                          ) : (
                            <span className="font-mono">{originDialog.registro.ci || "-"}</span>
                          )}
                        </p>
                      ) : originDialog.registro.destinatarioTipo === "EXTERNO" ? (
                        <p><span className="font-semibold text-stone-900">CI externa:</span> <span className="font-mono">{originDialog.registro.ci || "-"}</span></p>
                      ) : (
                        <p><span className="font-semibold text-stone-900">Clase de recinto:</span> {originDialog.registro.recintoClase ?? "-"}</p>
                      )}
                      <p><span className="font-semibold text-stone-900">Batería:</span> {originDialog.registro.bateria ?? "-"}</p>
                      <p><span className="font-semibold text-stone-900">Registrado por:</span> {originDialog.registro.usuarioEntregaNombre}</p>
                    </div>
                    {originDialog.registro.comentarios ? (
                      <p className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-base text-stone-700">
                        <span className="font-semibold text-stone-900">Comentarios:</span> {originDialog.registro.comentarios}
                      </p>
                    ) : null}
                    <section className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">Equipos del movimiento</p>
                      {originDialog.registro.equipos.map((equipo, index) => (
                        <p
                          key={`${originDialog.registro.registroId}-${equipo.equipoId}`}
                          className={`rounded-lg border border-stone-200 px-3 py-2 text-base text-stone-800 ${
                            index % 2 === 0 ? "bg-white" : "bg-stone-50/70"
                          }`}
                        >
                          <span className="font-semibold">{equipo.cantidad}</span> {equipo.nombre}
                        </p>
                      ))}
                    </section>
                    <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3">
                      <button
                        type="button"
                        onClick={() => window.open(`/api/registros/${encodeURIComponent(originDialog.registro.registroId)}/recibo`, "_blank")}
                        className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
                      >
                        Abrir recibo
                      </button>
                      <button
                        type="button"
                        onClick={() => setOriginDialog(null)}
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Cerrar
                      </button>
                    </footer>
                  </>
                )}
              </div>
            </ModalFrame>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
