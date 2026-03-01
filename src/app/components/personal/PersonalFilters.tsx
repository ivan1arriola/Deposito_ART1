"use client";

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
  return (
    <>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <input value={searchCedula} onChange={(event) => onSearchCedulaChange(event.target.value)} placeholder="Buscar por cédula" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input value={searchApellidos} onChange={(event) => onSearchApellidosChange(event.target.value)} placeholder="Buscar por apellidos" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input value={searchNombres} onChange={(event) => onSearchNombresChange(event.target.value)} placeholder="Buscar por nombres" className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <select value={bateriaFilter} onChange={(event) => onBateriaFilterChange(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
          <option value="ALL">Todas las baterías</option>
          <option value="NONE">Sin batería</option>
          {baterias.map((bateria) => (
            <option key={bateria.bateriaId} value={String(bateria.bateriaId)}>
              {bateria.nombre}
            </option>
          ))}
        </select>
      </div>
      {hasFilters ? (
        <div className="mt-2">
          <button type="button" onClick={onClear} className="rounded bg-stone-600 px-3 py-2 text-xs font-semibold text-white">
            Limpiar filtros
          </button>
        </div>
      ) : null}
    </>
  );
}
