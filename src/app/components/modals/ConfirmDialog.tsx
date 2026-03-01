"use client";

import type { ConfirmDialogState } from "@/types/views";
import { ModalFrame } from "./ModalFrame";

type ConfirmDialogModalProps = {
  dialog: ConfirmDialogState | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialogModal({ dialog, busy, onClose, onConfirm }: ConfirmDialogModalProps) {
  if (!dialog) return null;

  return (
    <ModalFrame onClose={onClose}>
      <h3 className="text-base font-semibold text-stone-900">{dialog.title}</h3>
      <p className="mt-2 text-sm text-stone-700">{dialog.message}</p>
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
            dialog.tone === "danger" ? "bg-rose-700 hover:bg-rose-800" : "bg-stone-700 hover:bg-stone-800"
          }`}
        >
          {busy ? "Procesando..." : dialog.confirmText}
        </button>
      </div>
    </ModalFrame>
  );
}
