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
  className?: string;
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
  className,
}: PersonalFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(hasFilters);
  const bateriaOptions = useMemo(
    () => [
      { value: "ALL", label: "Todas las baterías" },
      { value: "NONE", label: "Sin batería" },
      ...baterias.map((bateria) => ({ value: String(bateria.bateriaId), label: bateria.nombre })),
    ],
    [baterias],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchCedula.trim() !== "") count += 1;
    if (searchApellidos.trim() !== "") count += 1;
    if (searchNombres.trim() !== "") count += 1;
    if (bateriaFilter !== "ALL") count += 1;
    return count;
  }, [bateriaFilter, searchApellidos, searchCedula, searchNombres]);

  return (
    <section className={`rounded-2xl border border-stone-200 bg-stone-50/80 p-3 sm:p-4 ${className ?? ""}`}>
      <div className="flex flex-col gap-3 sm:min-h-[74px] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">Filtros de subalternos</p>
          <p className="mt-1 min-h-[20px] text-xs text-stone-600">
            {activeFilterCount > 0
              ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}`
              : "Busca subalternos por cédula, apellidos, nombres o batería."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={!hasFilters}
            className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={() => setShowMobileFilters((current) => !current)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 md:hidden"
          >
            {showMobileFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>
      </div>

      <div className={`${showMobileFilters ? "mt-3 grid" : "hidden"} grid-cols-1 gap-3 md:mt-4 md:grid md:grid-cols-3`}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Cédula</span>
          <input
            value={searchCedula}
            onChange={(event) => onSearchCedulaChange(event.target.value)}
            placeholder="Ej: 12345678"
            className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Apellidos</span>
          <input
            value={searchApellidos}
            onChange={(event) => onSearchApellidosChange(event.target.value)}
            placeholder="Buscar por apellidos"
            className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Nombres</span>
          <input
            value={searchNombres}
            onChange={(event) => onSearchNombresChange(event.target.value)}
            placeholder="Buscar por nombres"
            className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm"
          />
        </label>
        <label className="block md:col-span-3">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">Batería</span>
          <div className="mt-1 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
            {bateriaOptions.map((option) => {
              const isActive = bateriaFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onBateriaFilterChange(option.value)}
                  aria-pressed={isActive}
                  className={`h-11 w-full rounded-xl border px-3 text-xs font-semibold transition sm:text-sm ${
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
    </section>
  );
}
