"use client";

import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { SmallActionButton } from "@/app/components/shared";
import type { PersonalObservacion } from "@/types/entities";
import type { PersonalObservacionDraft } from "@/app/types/home";
import { ModalFrame } from "./ModalFrame";

type PersonalObservacionModalProps = {
  draft: PersonalObservacionDraft | null;
  saving: boolean;
  maxFechaIngreso: string;
  onClose: () => void;
  onReset: () => void;
  onEdit: (observacion: PersonalObservacion) => void;
  onDelete: (observacion: PersonalObservacion) => void;
  onDateChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
};

export function PersonalObservacionModal({
  draft,
  saving,
  maxFechaIngreso,
  onClose,
  onReset,
  onEdit,
  onDelete,
  onDateChange,
  onTextChange,
  onSubmit,
}: PersonalObservacionModalProps) {
  if (!draft) return null;

  return (
    <ModalFrame onClose={onClose} size="lg" closeOnBackdrop={false}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">{draft.observacionId ? "Editar Observación" : "Registrar Observación"}</h3>
          <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(draft.ci)}`}</p>
          <p className="text-xs font-medium text-stone-700">{`Personal: ${draft.nombre}`}</p>
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

      {saving || draft.loading ? (
        <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
          {saving ? "Guardando observación..." : "Cargando observaciones..."}
        </p>
      ) : null}

      {draft.error ? (
        <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{draft.error}</p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Observaciones registradas</p>
            {draft.observacionId ? (
              <button
                type="button"
                onClick={onReset}
                disabled={saving}
                className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Nueva observación
              </button>
            ) : null}
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {!draft.loading && draft.observaciones.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-sm text-stone-500">
                Sin observaciones registradas.
              </div>
            ) : null}
            {draft.observaciones.map((observacion) => (
              <article key={observacion.observacionId} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-stone-700">{formatDateOnlyForDisplay(observacion.fecha)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-stone-900">{observacion.texto}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <SmallActionButton text="Editar" tone="edit" onClick={() => onEdit(observacion)} />
                    <SmallActionButton text="Borrar" tone="delete" onClick={() => onDelete(observacion)} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              {draft.observacionId ? "Editar" : "Nueva"} observación
            </p>
            {draft.observacionId ? (
              <button
                type="button"
                onClick={onReset}
                disabled={saving}
                className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar edición
              </button>
            ) : null}
          </div>

          <div className="mt-3 space-y-3">
            <label className="block text-xs text-stone-700">
              Fecha
              <DateTextInput
                value={draft.fecha}
                disabled={saving}
                onChange={onDateChange}
                ariaLabel={`Fecha de observación. Máximo ${maxFechaIngreso}`}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-stone-700">
              Observación
              <textarea
                rows={7}
                value={draft.texto}
                disabled={saving}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder="Detalle asociado a la persona"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="rounded bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : draft.observacionId ? "Guardar cambios" : "Guardar observación"}
            </button>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
