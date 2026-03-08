"use client";

import type { UserProfileDialogState } from "@/app/types/home";
import { LoadingInline } from "@/app/components/shared";
import { ModalFrame } from "./ModalFrame";

type UsernameModalProps = {
  dialog: UserProfileDialogState | null;
  saving: boolean;
  onChange: (field: keyof Pick<UserProfileDialogState, "grado" | "nombre" | "apellido" | "username" | "mailReferencia">, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function UsernameModal({ dialog, saving, onChange, onClose, onSubmit }: UsernameModalProps) {
  if (!dialog) return null;

  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-base font-semibold text-stone-900">{dialog.title}</h3>
      <p className="mt-1 text-sm text-stone-600">{dialog.description}</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Grado</span>
          <input value={dialog.grado} onChange={(event) => onChange("grado", event.target.value)} placeholder="Grado" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Nombre</span>
          <input value={dialog.nombre} onChange={(event) => onChange("nombre", event.target.value)} placeholder="Nombre" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Apellido</span>
          <input value={dialog.apellido} onChange={(event) => onChange("apellido", event.target.value)} placeholder="Apellido" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Usuario</span>
          <input value={dialog.username} onChange={(event) => onChange("username", event.target.value)} placeholder="Nombre de usuario" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Mail de referencia</span>
          <input
            value={dialog.mailReferencia}
            onChange={(event) => onChange("mailReferencia", event.target.value)}
            placeholder="Mail de referencia (opcional)"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving || dialog.grado.trim() === "" || dialog.nombre.trim() === "" || dialog.apellido.trim() === "" || dialog.username.trim() === ""}
          className="rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? (
            <LoadingInline
              label="Guardando..."
              size="xs"
              tone="light"
              textClassName="text-xs font-semibold text-white"
            />
          ) : (
            "Guardar usuario"
          )}
        </button>
      </div>
    </ModalFrame>
  );
}
