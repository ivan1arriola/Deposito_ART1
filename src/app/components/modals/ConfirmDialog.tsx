"use client";

import { useEffect, useId, useRef } from "react";
import { consumePendingMenuTrigger } from "@/components/ui/DropdownMenu";
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
  const titleId = useId();
  const messageId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const isOpen = Boolean(dialog);

  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        const pendingTrigger = consumePendingMenuTrigger();
        const active =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        returnFocusRef.current =
          pendingTrigger && pendingTrigger.isConnected
            ? pendingTrigger
            : active && active !== document.body
              ? active
              : null;
      }
      wasOpenRef.current = true;
      cancelButtonRef.current?.focus();
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target?.isConnected) {
        target.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!dialog) return null;
  const isDestructive = dialog.tone === "danger";

  return (
    <ModalFrame onClose={busy ? () => undefined : onClose} zIndexClassName="z-[900]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h3 id={titleId} className="text-base font-semibold text-stone-900">
          {dialog.title}
        </h3>
        <div id={messageId} className="mt-2 max-h-[48vh] overflow-y-auto text-sm text-stone-700">
          {dialog.message}
        </div>
        {isDestructive ? (
          <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800">
            Advertencia: esta acción es irreversible y no se puede deshacer.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="min-h-9 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dialog.cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-9 rounded px-3 py-1.5 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:opacity-60 ${
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
      </div>
    </ModalFrame>
  );
}
