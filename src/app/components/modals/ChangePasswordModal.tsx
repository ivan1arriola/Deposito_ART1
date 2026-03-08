"use client";

import { LoadingInline } from "@/app/components/shared";
import { ModalFrame } from "./ModalFrame";

type ChangePasswordModalProps = {
  isOpen: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function ChangePasswordModal({
  isOpen,
  currentPassword,
  newPassword,
  confirmPassword,
  loading,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  if (!isOpen) return null;

  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-base font-semibold text-stone-900">Cambiar contraseña</h3>
      <p className="mt-1 text-xs text-stone-600">Ingresa tu contraseña actual y la nueva contraseña.</p>

      <div className="mt-3 space-y-2">
        <input
          value={currentPassword}
          onChange={(event) => onCurrentPasswordChange(event.target.value)}
          placeholder="Contraseña actual"
          type="password"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={newPassword}
          onChange={(event) => onNewPasswordChange(event.target.value)}
          placeholder="Nueva contraseña"
          type="password"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={confirmPassword}
          onChange={(event) => onConfirmPasswordChange(event.target.value)}
          placeholder="Confirmar contraseña"
          type="password"
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
          disabled={loading}
          onClick={onSubmit}
          className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? (
            <LoadingInline
              label="Procesando..."
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
