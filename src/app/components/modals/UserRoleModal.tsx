"use client";

import { ROLE_OPTIONS, type Role } from "@/types/entities";
import type { UserRoleDialogState } from "@/app/types/home";
import { ModalFrame } from "./ModalFrame";

type UserRoleModalProps = {
  dialog: UserRoleDialogState | null;
  saving: boolean;
  roleLabel: (role: Role | null | undefined) => string;
  roleDescription: (role: Role) => string;
  roleScope: (role: Role) => string;
  onRoleChange: (role: Role) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function UserRoleModal({
  dialog,
  saving,
  roleLabel,
  roleDescription,
  roleScope,
  onRoleChange,
  onClose,
  onSubmit,
}: UserRoleModalProps) {
  if (!dialog) return null;

  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-base font-semibold text-stone-900">Cambiar rol de usuario</h3>
      <p className="mt-1 text-sm text-stone-600">{`Usuario: ${dialog.username}`}</p>
      <p className="mt-1 text-xs text-stone-500">{`Rol actual: ${roleLabel(dialog.currentRole)}`}</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ROLE_OPTIONS.map((role) => {
          const selected = dialog.nextRole === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => onRoleChange(role)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
              }`}
            >
              <p className="text-sm font-semibold">{roleLabel(role)}</p>
              <p className={`mt-1 text-xs ${selected ? "text-stone-200" : "text-stone-500"}`}>{roleDescription(role)}</p>
              <p className={`mt-2 text-[11px] font-medium uppercase tracking-wide ${selected ? "text-stone-300" : "text-stone-400"}`}>
                {roleScope(role)}
              </p>
            </button>
          );
        })}
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
          disabled={saving || dialog.nextRole === dialog.currentRole}
          className="rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar rol"}
        </button>
      </div>
    </ModalFrame>
  );
}
