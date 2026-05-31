"use client";

import { ModalFrame } from "./ModalFrame";

type MergeEquipoOption = {
  equipoId: string;
  nombre: string;
};

type MergeEquipoModalProps = {
  isOpen: boolean;
  sourceName: string;
  targetEquipoId: string;
  targetOptions: MergeEquipoOption[];
  saving: boolean;
  onTargetChange: (equipoId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function MergeEquipoModal({
  isOpen,
  sourceName,
  targetEquipoId,
  targetOptions,
  saving,
  onTargetChange,
  onClose,
  onSubmit,
}: MergeEquipoModalProps) {
  if (!isOpen) return null;

  const targetOptionsSorted = [...targetOptions].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  const canSubmit = !saving && sourceName.trim() !== "" && targetEquipoId.trim() !== "" && targetOptions.length > 0;

  return (
    <ModalFrame onClose={onClose} size="md">
      <h3 className="text-base font-semibold text-stone-900">Reasignar movimientos de equipo</h3>
      <p className="mt-2 text-sm text-stone-700">
        Se moverán todos los movimientos de <strong>{sourceName}</strong> al equipo que selecciones abajo.
      </p>
      <p className="mt-1 text-xs text-rose-700">Acción irreversible: luego se eliminará el equipo original.</p>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Equipo destino</span>
        <select
          value={targetEquipoId}
          onChange={(event) => onTargetChange(event.target.value)}
          disabled={saving || targetOptions.length === 0}
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Seleccionar equipo destino</option>
          {targetOptionsSorted.map((option) => (
            <option key={`merge-target-${option.equipoId}`} value={option.equipoId}>
              {option.nombre}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Reasignando..." : "Reasignar y eliminar"}
        </button>
      </div>
    </ModalFrame>
  );
}
