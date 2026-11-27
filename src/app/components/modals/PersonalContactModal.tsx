"use client";

import { LoadingInline } from "@/app/components/shared";
import { ModalFrame } from "./ModalFrame";

type PersonalContactModalProps = {
  isOpen: boolean;
  telefonoContacto: string;
  mailReferencia: string;
  saving: boolean;
  onTelefonoContactoChange: (value: string) => void;
  onMailReferenciaChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function PersonalContactModal({
  isOpen,
  telefonoContacto,
  mailReferencia,
  saving,
  onTelefonoContactoChange,
  onMailReferenciaChange,
  onClose,
  onSubmit,
}: PersonalContactModalProps) {
  if (!isOpen) return null;

  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-base font-semibold text-stone-900">Actualizar contacto</h3>
      <p className="mt-1 text-xs text-stone-600">
        Puedes registrar o actualizar tu celular y correo electrónico.
      </p>

      <div className="mt-3 space-y-2">
        <input
          value={telefonoContacto}
          onChange={(event) => onTelefonoContactoChange(event.target.value)}
          placeholder="Celular (ej: 099123456)"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={mailReferencia}
          onChange={(event) => onMailReferenciaChange(event.target.value)}
          placeholder="Correo electrónico"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? (
            <LoadingInline
              label="Guardando..."
              size="xs"
              tone="light"
              textClassName="text-xs font-semibold text-white"
            />
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </ModalFrame>
  );
}
