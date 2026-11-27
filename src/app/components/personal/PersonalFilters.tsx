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
    [baterias]
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
    <section
      className={`rounded-[28px] border border-[rgba(88,80,58,0.18)] bg-[linear-gradient(180deg,rgba(247,244,234,0.96)_0%,rgba(232,228,213,0.94)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] sm:p-4 ${className ?? ""}`}
    >
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
            className="rounded-xl border border-[rgba(36,43,30,0.76)] bg-[linear-gradient(180deg,rgba(67,78,53,0.98)_0%,rgba(43,52,35,0.98)_100%)] px-3 py-2 text-xs font-bold text-[rgba(245,239,219,0.96)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={() => setShowMobileFilters((current) => !current)}
            className="rounded-xl border border-[rgba(95,86,61,0.26)] bg-[linear-gradient(180deg,rgba(250,248,240,0.96)_0%,rgba(237,233,220,0.94)_100%)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] md:hidden"
          >
            {showMobileFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>
      </div>

      <div
        className={`${showMobileFilters ? "mt-3 grid" : "hidden"} grid-cols-1 gap-3 md:mt-4 md:grid md:grid-cols-3`}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Cédula
          </span>
          <input
            value={searchCedula}
            onChange={(event) => onSearchCedulaChange(event.target.value)}
            placeholder="Ej: 12345678"
            className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Apellidos
          </span>
          <input
            value={searchApellidos}
            onChange={(event) => onSearchApellidosChange(event.target.value)}
            placeholder="Buscar por apellidos"
            className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Nombres
          </span>
          <input
            value={searchNombres}
            onChange={(event) => onSearchNombresChange(event.target.value)}
            placeholder="Buscar por nombres"
            className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm"
          />
        </label>
        <label className="block md:col-span-3">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Batería
          </span>
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
                      ? "border-[rgba(145,111,26,0.78)] bg-[linear-gradient(180deg,rgba(255,210,74,0.98)_0%,rgba(214,170,38,0.98)_100%)] text-[var(--color-ejercito-black)] shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]"
                      : "border-[rgba(95,86,61,0.24)] bg-[linear-gradient(180deg,rgba(250,248,240,0.96)_0%,rgba(237,233,220,0.94)_100%)] text-[var(--color-text-primary)] hover:bg-[rgba(94,107,72,0.12)]"
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
