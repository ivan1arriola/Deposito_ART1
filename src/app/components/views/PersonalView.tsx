"use client";

import { Fragment } from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import type { Bateria, Personal } from "@/types/entities";
import { apellidosLabel, nombresLabel, tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import { EMPTY_PERSONAL_FORM } from "@/types/forms";
import { SmallActionButton, PaginationControls } from "../shared";

export interface PersonalViewProps {
  personalFiltradoPaginado: Personal[];
  personalFiltrado: Personal[];
  personalPage: number;
  personalPageSize: number;
  searchCedula: string;
  searchNombres: string;
  searchApellidos: string;
  bateriaFilter: string;
  hasPersonalFilters: boolean;
  baterias: Bateria[];
  canWrite: boolean;
  expandedTallasByCi: Record<string, boolean>;
  editPersonalCi: string | null;
  onSearchCedulaChange: (value: string) => void;
  onSearchNombresChange: (value: string) => void;
  onSearchApellidosChange: (value: string) => void;
  onBateriaFilterChange: (value: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onToggleTallas: (ci: string) => void;
  onCreateNew: () => void;
  onEdit: (persona: Personal) => void;
  onCancelEdit: () => void;
  onDelete: (ci: string) => Promise<void>;
  onEntrega: (ci: string) => void;
  onDevolucion: (ci: string) => void;
  onVerMovimientos: (persona: Personal) => Promise<void>;
  renderInlineEditForm: (ci: string) => React.ReactNode;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function PersonalView({
  personalFiltradoPaginado,
  personalFiltrado,
  personalPage,
  personalPageSize,
  searchCedula,
  searchNombres,
  searchApellidos,
  bateriaFilter,
  hasPersonalFilters,
  baterias,
  canWrite,
  expandedTallasByCi,
  editPersonalCi,
  onSearchCedulaChange,
  onSearchNombresChange,
  onSearchApellidosChange,
  onBateriaFilterChange,
  onClearFilters,
  onPageChange,
  onPageSizeChange,
  onToggleTallas,
  onCreateNew,
  onEdit,
  onCancelEdit,
  onDelete,
  onEntrega,
  onDevolucion,
  onVerMovimientos,
  renderInlineEditForm,
}: PersonalViewProps) {
  return (
    <section className="ej-card mt-6 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Personal</h2>
          <p className="mt-1 text-xs text-stone-600">Orden: Grado del Personal, Apellidos y Nombres.</p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          disabled={!canWrite}
          className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Registrar nuevo
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <input
          value={searchCedula}
          onChange={(event) => onSearchCedulaChange(event.target.value)}
          placeholder="Buscar por cedula"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={searchNombres}
          onChange={(event) => onSearchNombresChange(event.target.value)}
          placeholder="Buscar por nombres"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={searchApellidos}
          onChange={(event) => onSearchApellidosChange(event.target.value)}
          placeholder="Buscar por apellidos"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <select
          value={bateriaFilter}
          onChange={(event) => onBateriaFilterChange(event.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="ALL">Todas las baterias</option>
          <option value="NONE">Sin bateria</option>
          {baterias.map((bateria) => (
            <option key={bateria.bateriaId} value={String(bateria.bateriaId)}>
              {bateria.nombre}
            </option>
          ))}
        </select>
      </div>

      {hasPersonalFilters ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded bg-stone-600 px-3 py-2 text-xs font-semibold text-white"
          >
            Limpiar filtros
          </button>
        </div>
      ) : null}

      <PaginationControls
        page={personalPage}
        pageSize={personalPageSize}
        totalItems={personalFiltrado.length}
        itemLabel="personas"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
      />

      {/* Vista móvil - Tarjetas */}
      <div className="mt-3 space-y-3 md:hidden">
        {personalFiltradoPaginado.map((persona) => {
          const tallas = tallasMap(persona.tallas);
          const ciValida = isValidUruguayanCi(persona.ci);
          const tallasOpen = expandedTallasByCi[persona.ci] === true;
          const editing = editPersonalCi === persona.ci;
          return (
            <article
              key={persona.ci}
              className={`rounded-xl border p-3 ${ciValida ? "border-stone-200 bg-stone-50/80" : "border-red-300 bg-red-50/70"}`}
            >
              <p className={`text-xs font-mono ${ciValida ? "text-stone-600" : "font-semibold text-red-700"}`}>
                {formatUruguayanCi(persona.ci)}
                {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
              </p>
              <p className="mt-2 text-sm font-bold text-stone-900">{persona.rango.nombreCompleto}</p>
              <p className="mt-2 text-sm text-stone-900">
                <span className="font-semibold">Apellidos:</span> {apellidosLabel(persona)}
              </p>
              <p className="text-sm text-stone-900">
                <span className="font-semibold">Nombres:</span> {nombresLabel(persona)}
              </p>
              <p className="mt-1 text-xs text-stone-600">{persona.bateria?.nombre ?? "Sin bateria"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <SmallActionButton
                  text={editing ? "Cancelar" : "Editar"}
                  tone={editing ? "neutral" : "edit"}
                  onClick={() => {
                    if (editing) {
                      onCancelEdit();
                      return;
                    }
                    onEdit(persona);
                  }}
                />
                <SmallActionButton text="Borrar" tone="delete" onClick={() => void onDelete(persona.ci)} />
                <button
                  type="button"
                  onClick={() => onToggleTallas(persona.ci)}
                  className="rounded bg-stone-600 px-2 py-1 text-xs font-medium text-white"
                >
                  {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
                </button>
                <button
                  type="button"
                  onClick={() => onEntrega(persona.ci)}
                  className="rounded bg-emerald-700 px-2 py-1 text-xs font-medium text-white"
                >
                  Entrega
                </button>
                <button
                  type="button"
                  onClick={() => onDevolucion(persona.ci)}
                  className="rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white"
                >
                  Devolucion
                </button>
                <button
                  type="button"
                  onClick={() => void onVerMovimientos(persona)}
                  className="rounded bg-sky-700 px-2 py-1 text-xs font-medium text-white"
                >
                  Ver movimientos
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/ficha/${encodeURIComponent(persona.ci)}`, "_blank", "noopener,noreferrer")}
                  className="rounded bg-indigo-700 px-2 py-1 text-xs font-medium text-white"
                >
                  Ficha
                </button>
              </div>
              {tallasOpen ? (
                <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {tallasEntries(tallas).map((entry) => (
                      <div key={entry.key} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{entry.label}</p>
                        <p className="mt-1 text-sm font-bold text-stone-900">{entry.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {editing ? <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3">{renderInlineEditForm(persona.ci)}</div> : null}
            </article>
          );
        })}
        {personalFiltrado.length === 0 ? <p className="text-sm text-stone-500">Sin resultados con los filtros actuales.</p> : null}
      </div>

      {/* Vista escritorio - Tabla */}
      <div className="mt-3 hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="w-[11%] px-3 py-2">CI</th>
              <th className="w-[15%] px-3 py-2">Grado del Personal</th>
              <th className="w-[18%] px-3 py-2">Apellidos</th>
              <th className="w-[18%] px-3 py-2">Nombres</th>
              <th className="w-[13%] px-3 py-2">Bateria</th>
              <th className="w-[9%] px-3 py-2">Detalles</th>
              <th className="w-[16%] px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {personalFiltradoPaginado.map((persona) => {
              const tallas = tallasMap(persona.tallas);
              const ciValida = isValidUruguayanCi(persona.ci);
              const tallasOpen = expandedTallasByCi[persona.ci] === true;
              const editing = editPersonalCi === persona.ci;
              return (
                <Fragment key={persona.ci}>
                  <tr className={!ciValida ? "bg-red-50/60" : undefined}>
                    <td className={`px-3 py-2 font-mono text-xs ${ciValida ? "text-stone-700" : "font-bold text-red-700"}`}>
                      <div>
                        {formatUruguayanCi(persona.ci)}
                        {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-stone-900">
                      <span className="font-bold">{persona.rango.nombreCompleto}</span>
                    </td>
                    <td className="px-3 py-2 text-stone-900">{apellidosLabel(persona)}</td>
                    <td className="px-3 py-2 text-stone-900">{nombresLabel(persona)}</td>
                    <td className="px-3 py-2 text-stone-700">{persona.bateria?.nombre ?? "Sin bateria"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => onToggleTallas(persona.ci)}
                        className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700"
                      >
                        {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
                      </button>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="grid grid-cols-2 gap-1.5">
                        <SmallActionButton
                          text={editing ? "Cancelar" : "Editar"}
                          tone={editing ? "neutral" : "edit"}
                          className="w-full text-[11px] leading-tight"
                          onClick={() => {
                            if (editing) {
                              onCancelEdit();
                              return;
                            }
                            onEdit(persona);
                          }}
                        />
                        <SmallActionButton
                          text="Borrar"
                          tone="delete"
                          className="w-full text-[11px] leading-tight"
                          onClick={() => void onDelete(persona.ci)}
                        />
                        <button
                          type="button"
                          onClick={() => onEntrega(persona.ci)}
                          className="w-full rounded bg-emerald-700 px-2 py-1 text-[11px] font-medium leading-tight text-white"
                        >
                          Entrega
                        </button>
                        <button
                          type="button"
                          onClick={() => onDevolucion(persona.ci)}
                          className="w-full rounded bg-amber-700 px-2 py-1 text-[11px] font-medium leading-tight text-white"
                        >
                          Devolucion
                        </button>
                        <button
                          type="button"
                          onClick={() => void onVerMovimientos(persona)}
                          className="w-full rounded bg-sky-700 px-2 py-1 text-[11px] font-medium leading-tight text-white"
                        >
                          Ver movimientos
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(`/ficha/${encodeURIComponent(persona.ci)}`, "_blank", "noopener,noreferrer")}
                          className="w-full rounded bg-indigo-700 px-2 py-1 text-[11px] font-medium leading-tight text-white"
                        >
                          Ficha
                        </button>
                      </div>
                    </td>
                  </tr>
                  {tallasOpen ? (
                    <tr className="bg-stone-50/80">
                      <td colSpan={7} className="px-3 py-2">
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                          {tallasEntries(tallas).map((entry) => (
                            <div key={entry.key} className="rounded-md border border-stone-200 bg-white px-2 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{entry.label}</p>
                              <p className="mt-1 text-sm font-bold text-stone-900">{entry.value}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {editing ? (
                    <tr className="bg-white">
                      <td colSpan={7} className="px-3 py-3">
                        {renderInlineEditForm(persona.ci)}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {personalFiltrado.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-sm text-stone-500">
                  Sin resultados con los filtros actuales.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
