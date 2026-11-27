"use client";

import type { ConfirmDialogState } from "@/types/views";
import { LoadingInline } from "@/app/components/shared";
import { ModalFrame } from "./ModalFrame";

type ConfirmDialogModalProps = {
  dialog: ConfirmDialogState | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialogModal({ dialog, busy, onClose, onConfirm }: ConfirmDialogModalProps) {
  if (!dialog) return null;
  const isDestructive = dialog.tone === "danger";

  return (
    <ModalFrame onClose={onClose} zIndexClassName="z-[900]">
      <h3 className="text-base font-semibold text-stone-900">{dialog.title}</h3>
      <div className="mt-2 max-h-[48vh] overflow-y-auto text-sm text-stone-700">
        {dialog.message}
      </div>
      {isDestructive ? (
        <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800">
          Advertencia: esta acción es irreversible y no se puede deshacer.
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {dialog.cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`rounded px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
            isDestructive ? "bg-rose-700 hover:bg-rose-800" : "bg-stone-700 hover:bg-stone-800"
          }`}
        >
          {busy ? (
            <LoadingInline
              label="Procesando..."
              size="xs"
              tone="light"
              textClassName="text-xs font-semibold text-white"
            />
          ) : (
            dialog.confirmText
          )}
        </button>
      </div>
    </ModalFrame>
  );
}
