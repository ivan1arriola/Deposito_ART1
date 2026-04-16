"use client";

import { useState } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { formatUruguayanCi } from "@/lib/ci";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import type { Equipo, Personal } from "@/types/entities";
import type { RegistroDraft } from "@/types/forms";
import { ModalFrame } from "./ModalFrame";

type RegistroEditorModalProps = {
  draft: RegistroDraft | null;
  personaLabel: string | null;
  personalFiltrado: Personal[];
  equiposOrdenados: Equipo[];
  maxFechaIngreso: string;
  saving: boolean;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onComentariosChange: (value: string) => void;
  onToggleIncluirFueraDeHoja: () => void;
  onToggleDestinatario: (ci: string) => void;
  onSelectAllDestinatarios: () => void;
  onClearDestinatarios: () => void;
  onItemChange: (index: number, field: "itemId" | "cantidad", value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
};

export function RegistroEditorModal({
  draft,
  personaLabel,
  personalFiltrado,
  equiposOrdenados,
  maxFechaIngreso,
  saving,
  onClose,
  onDateChange,
  onComentariosChange,
  onToggleIncluirFueraDeHoja,
  onToggleDestinatario,
  onSelectAllDestinatarios,
  onClearDestinatarios,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
}: RegistroEditorModalProps) {
  const [destinatarioSearch, setDestinatarioSearch] = useState("");

  if (!draft) return null;
  const isRectificacion = draft.modo === "rectificar";
  const selectedCis =
    draft.ciList.length > 0 ? Array.from(new Set(draft.ciList)) : draft.ci.trim() !== "" ? [draft.ci.trim()] : [];
  const selectedCiSet = new Set(selectedCis);
  const personalFiltradoOrdenado = [...personalFiltrado].sort((a, b) =>
    `${apellidosLabel(a)} ${nombresLabel(a)}`.localeCompare(`${apellidosLabel(b)} ${nombresLabel(b)}`, "es", {
      sensitivity: "base",
    }),
  );
  const destinatarioSearchNormalized = destinatarioSearch.trim().toLowerCase();
  const personalVisible =
    destinatarioSearchNormalized === ""
      ? personalFiltradoOrdenado
      : personalFiltradoOrdenado.filter((persona) => {
          const label = `${apellidosLabel(persona)} ${nombresLabel(persona)}`.toLowerCase();
          const formattedCi = formatUruguayanCi(persona.ci).toLowerCase();
          return (
            persona.ci.toLowerCase().includes(destinatarioSearchNormalized) ||
            formattedCi.includes(destinatarioSearchNormalized) ||
            label.includes(destinatarioSearchNormalized)
          );
        });
  const equiposOrdenadosAlfabeticamente = [...equiposOrdenados].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
  const canIncludeFueraDeHoja = draft.modo === "crear" && draft.tipo === "ENTREGA";
  const includeInactiveItems = canIncludeFueraDeHoja && draft.incluirFueraDeHoja;

  return (
    <ModalFrame onClose={onClose} size="lg" closeOnBackdrop={false}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            {draft.modo === "rectificar"
              ? draft.tipo === "ENTREGA"
                ? "Rectificar Entrega"
                : "Rectificar Devolución"
              : draft.tipo === "ENTREGA"
                ? "Registrar Entrega"
                : "Registrar Devolución"}
          </h3>
          {isRectificacion ? <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(draft.ci)}`}</p> : null}
          {!isRectificacion ? (
            <p className="text-xs text-stone-600">{`Destinatarios seleccionados: ${selectedCis.length}`}</p>
          ) : null}
          {draft.modo === "rectificar" && draft.registroId ? <p className="text-xs text-stone-600">{`Registro #${draft.registroId}`}</p> : null}
          {personaLabel ? <p className="text-xs font-medium text-stone-700">{`Subalterno: ${personaLabel}`}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded bg-stone-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cerrar
        </button>
      </div>

      {saving ? (
        <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
          Actualizando movimiento...
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs text-stone-700">
          Fecha
          <DateTextInput
            value={draft.fecha}
            disabled={saving}
            onChange={onDateChange}
            ariaLabel={`Fecha del movimiento. Maximo ${maxFechaIngreso}`}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-stone-700">
          Comentarios (opcional)
          <input
            value={draft.comentarios}
            disabled={saving}
            onChange={(event) => onComentariosChange(event.target.value)}
            placeholder="Detalle breve"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {canIncludeFueraDeHoja ? (
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <input
            type="checkbox"
            checked={draft.incluirFueraDeHoja}
            disabled={saving}
            onChange={onToggleIncluirFueraDeHoja}
            className="mt-0.5"
          />
          <span>
            Incluir equipos fuera de hoja de entrega (no visibles en la hoja estándar).
          </span>
        </label>
      ) : null}

      {!isRectificacion ? (
        <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">Destinatarios</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSelectAllDestinatarios}
                disabled={saving || personalFiltradoOrdenado.length === 0}
                className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Seleccionar todos
              </button>
              <button
                type="button"
                onClick={onClearDestinatarios}
                disabled={saving || selectedCis.length === 0}
                className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpiar
              </button>
            </div>
          </div>
          <input
            value={destinatarioSearch}
            disabled={saving}
            onChange={(event) => setDestinatarioSearch(event.target.value)}
            placeholder="Buscar por CI, apellidos o nombres"
            className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2">
            {personalVisible.length === 0 ? (
              <p className="px-2 py-2 text-xs text-stone-500">No hay subalternos para el filtro actual.</p>
            ) : (
              personalVisible.map((persona) => {
                const checked = selectedCiSet.has(persona.ci);
                return (
                  <label
                    key={persona.ci}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs ${
                      checked ? "bg-emerald-50 text-emerald-900" : "hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={() => onToggleDestinatario(persona.ci)}
                    />
                    <span className="font-mono text-[11px] text-stone-600">{formatUruguayanCi(persona.ci)}</span>
                    <span className="text-stone-800">{`${apellidosLabel(persona)}, ${nombresLabel(persona)}`}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Equipos del movimiento</p>
        {draft.items.map((item, index) => (
          <div key={`reg-item-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
            <select
              value={item.itemId}
              disabled={saving}
              onChange={(event) => onItemChange(index, "itemId", event.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar equipo</option>
              {equiposOrdenadosAlfabeticamente
                .filter((catalogItem) => {
                  if (!includeInactiveItems && !catalogItem.activo && catalogItem.itemId !== item.itemId) return false;
                  if (catalogItem.itemId === item.itemId) return true;
                  return !draft.items.some(
                    (selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.itemId === catalogItem.itemId,
                  );
                })
                .map((catalogItem) => (
                  <option key={catalogItem.itemId} value={catalogItem.itemId}>
                    {catalogItem.activo ? catalogItem.nombre : `${catalogItem.nombre} (fuera de hoja)`}
                  </option>
                ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.cantidad}
              disabled={saving}
              onChange={(event) => onItemChange(index, "cantidad", event.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onRemoveItem(index)}
              disabled={saving || draft.items.length <= 1}
              className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2">
        <div>
          <button
            type="button"
            onClick={onAddItem}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-white">+</span>
            Equipo
          </button>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? draft.modo === "rectificar"
              ? "Guardando rectificación..."
              : "Guardando movimiento..."
            : draft.modo === "rectificar"
              ? "Guardar rectificación"
              : "Guardar movimiento"}
        </button>
      </div>
    </ModalFrame>
  );
}

