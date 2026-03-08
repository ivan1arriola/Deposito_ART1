"use client";

import type { UserPasswordDialogState } from "@/app/types/home";
import { LoadingInline } from "@/app/components/shared";
import { ModalFrame } from "./ModalFrame";

type UserPasswordModalProps = {
  dialog: UserPasswordDialogState | null;
  saving: boolean;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function UserPasswordModal({
  dialog,
  saving,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onClose,
  onSubmit,
}: UserPasswordModalProps) {
  if (!dialog) return null;

  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-base font-semibold text-stone-900">Cambiar contraseña de usuario</h3>
      <p className="mt-1 text-sm text-stone-600">{`Usuario: ${dialog.username}`}</p>
      <p className="mt-1 text-xs text-stone-500">Define una nueva contraseña para la cuenta seleccionada.</p>

      <div className="mt-4 space-y-2">
        <input
          value={dialog.newPassword}
          onChange={(event) => onNewPasswordChange(event.target.value)}
          placeholder="Nueva contraseña"
          type="password"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={dialog.confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          placeholder="Confirmar nueva contraseña"
          type="password"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
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
          disabled={saving || dialog.newPassword.trim() === "" || dialog.confirmPassword.trim() === ""}
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
            "Guardar contrasena"
          )}
        </button>
      </div>
    </ModalFrame>
  );
}

