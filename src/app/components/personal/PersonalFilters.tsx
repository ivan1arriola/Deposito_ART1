"use client";

import { useId, useState } from "react";
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

const fieldClass =
  "min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800";
const labelClass = "mb-1 block text-sm font-medium text-stone-700";

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
  const panelId = useId();
  const [expanded, setExpanded] = useState(
    Boolean(searchCedula || searchNombres || bateriaFilter !== "ALL")
  );

  return (
    <section
      aria-label="Filtros de subalternos"
      className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-stone-200 px-4 py-3 @min-[44rem]:grid-cols-[1.2fr_1fr_.8fr_1fr_auto]"
    >
      <label className="min-w-0">
        <span className={labelClass}>Apellidos</span>
        <input
          type="search"
          value={searchApellidos}
          onChange={(event) => onSearchApellidosChange(event.target.value)}
          placeholder="Buscar apellido"
          className={fieldClass}
        />
      </label>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((current) => !current)}
        className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 @min-[44rem]:hidden"
      >
        Filtros
      </button>
      <div
        id={panelId}
        className={
          (expanded ? "grid" : "hidden") +
          " col-span-full gap-3 sm:grid-cols-3 @min-[44rem]:contents"
        }
      >
        <label className="min-w-0">
          <span className={labelClass}>Nombres</span>
          <input
            type="search"
            value={searchNombres}
            onChange={(event) => onSearchNombresChange(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="min-w-0">
          <span className={labelClass}>Cédula</span>
          <input
            inputMode="numeric"
            value={searchCedula}
            onChange={(event) => onSearchCedulaChange(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="min-w-0">
          <span className={labelClass}>Batería</span>
          <select
            value={bateriaFilter}
            onChange={(event) => onBateriaFilterChange(event.target.value)}
            className={fieldClass}
          >
            <option value="ALL">Todas las baterías</option>
            <option value="NONE">Sin batería</option>
            {baterias.map((bateria) => (
              <option key={bateria.bateriaId} value={bateria.bateriaId}>
                {bateria.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={onClear}
        disabled={!hasFilters}
        className={
          (hasFilters ? "block" : "hidden") +
          " col-span-full min-h-11 w-fit rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-[var(--color-ejercito-blue)] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:text-stone-500 @min-[44rem]:col-span-1 @min-[44rem]:block"
        }
      >
        Limpiar filtros
      </button>
    </section>
  );
}
