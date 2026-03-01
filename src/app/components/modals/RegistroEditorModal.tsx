"use client";

import { formatUruguayanCi } from "@/lib/ci";
import type { Equipo } from "@/types/entities";
import type { RegistroDraft } from "@/types/forms";
import { ModalFrame } from "./ModalFrame";

type RegistroEditorModalProps = {
  draft: RegistroDraft | null;
  personaLabel: string | null;
  equiposOrdenados: Equipo[];
  maxFechaIngreso: string;
  saving: boolean;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onComentariosChange: (value: string) => void;
  onItemChange: (index: number, field: "itemId" | "cantidad", value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
};

export function RegistroEditorModal({
  draft,
  personaLabel,
  equiposOrdenados,
  maxFechaIngreso,
  saving,
  onClose,
  onDateChange,
  onComentariosChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
}: RegistroEditorModalProps) {
  if (!draft) return null;

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
          <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(draft.ci)}`}</p>
          {draft.modo === "rectificar" && draft.registroId ? <p className="text-xs text-stone-600">{`Registro #${draft.registroId}`}</p> : null}
          {personaLabel ? <p className="text-xs font-medium text-stone-700">{`Personal: ${personaLabel}`}</p> : null}
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
          <input
            type="date"
            max={maxFechaIngreso}
            value={draft.fecha}
            disabled={saving}
            onChange={(event) => onDateChange(event.target.value)}
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
              {equiposOrdenados
                .filter((catalogItem) => {
                  if (!catalogItem.activo && catalogItem.itemId !== item.itemId) return false;
                  if (catalogItem.itemId === item.itemId) return true;
                  return !draft.items.some(
                    (selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.itemId === catalogItem.itemId,
                  );
                })
                .map((catalogItem) => (
                  <option key={catalogItem.itemId} value={catalogItem.itemId}>
                    {catalogItem.nombre}
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
        <button
          type="button"
          onClick={onAddItem}
          disabled={saving}
          className="rounded bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agregar equipo
        </button>
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
