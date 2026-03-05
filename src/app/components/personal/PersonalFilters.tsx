"use client";

import { useMemo, useState } from "react";
import type { Bateria } from "@/types/entities";

type PersonalFiltersProps = {
  searchCedula: string;
  searchApellidos: string;
  searchNombres: string;
  bateriaFilter: string;
  baterias: Bateria[];
  hasFilters: boolean;
  onSearchCedulaChange: (value: string) => void;
  onSearchApellidosChange: (value: string) => void;
  onSearchNombresChange: (value: string) => void;
  onBateriaFilterChange: (value: string) => void;
  onClear: () => void;
};

export function PersonalFilters({
  searchCedula,
  searchApellidos,
  searchNombres,
  bateriaFilter,
  baterias,
  hasFilters,
  onSearchCedulaChange,
  onSearchApellidosChange,
  onSearchNombresChange,
  onBateriaFilterChange,
  onClear,
}: PersonalFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(hasFilters);
  const bateriaOptions = useMemo(
    () => [
      { value: "ALL", label: "Todas las baterias" },
      { value: "NONE", label: "Sin bateria" },
      ...baterias.map((bateria) => ({ value: String(bateria.bateriaId), label: bateria.nombre })),
    ],
    [baterias],
  );
  const filtersVisible = showMobileFilters;
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchCedula.trim() !== "") count += 1;
    if (searchApellidos.trim() !== "") count += 1;
    if (searchNombres.trim() !== "") count += 1;
    if (bateriaFilter !== "ALL") count += 1;
    return count;
  }, [bateriaFilter, searchApellidos, searchCedula, searchNombres]);

  return (
    <section className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/80 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">Filtros de busqueda</p>
          <p className="mt-1 text-xs text-stone-600">
            {activeFilterCount > 0
              ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`
              : "Busca rapido por cedula, apellidos, nombres o bateria."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters ? (
            <button type="button" onClick={onClear} className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white">
              Limpiar filtros
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowMobileFilters((current) => !current)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 md:hidden"
          >
            {filtersVisible ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>
      </div>

      <div className={`${filtersVisible ? "mt-3 grid" : "hidden"} grid-cols-1 gap-3 md:mt-4 md:grid md:grid-cols-2 xl:grid-cols-4`}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Cedula</span>
          <input
            value={searchCedula}
            onChange={(event) => onSearchCedulaChange(event.target.value)}
            placeholder="Ej: 12345678"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Apellidos</span>
          <input
            value={searchApellidos}
            onChange={(event) => onSearchApellidosChange(event.target.value)}
            placeholder="Buscar por apellidos"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Nombres</span>
          <input
            value={searchNombres}
            onChange={(event) => onSearchNombresChange(event.target.value)}
            placeholder="Buscar por nombres"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block md:col-span-2 xl:col-span-4">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Bateria</span>
          <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
            {bateriaOptions.map((option) => {
              const isActive = bateriaFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onBateriaFilterChange(option.value)}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    isActive
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </label>
      </div>

      {hasFilters ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchCedula.trim() !== "" ? <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">CI: {searchCedula.trim()}</span> : null}
          {searchApellidos.trim() !== "" ? <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">Apellidos: {searchApellidos.trim()}</span> : null}
          {searchNombres.trim() !== "" ? <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">Nombres: {searchNombres.trim()}</span> : null}
          {bateriaFilter !== "ALL" ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
              {bateriaFilter === "NONE" ? "Sin bateria" : `Bateria: ${baterias.find((bateria) => String(bateria.bateriaId) === bateriaFilter)?.nombre ?? bateriaFilter}`}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
