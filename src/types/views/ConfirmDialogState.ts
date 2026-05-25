import type { ReactNode } from "react";

export type ConfirmDialogState = {
  title: string;
  message: ReactNode;
  confirmText: string;
  cancelText: string;
  tone: "danger" | "neutral";
  onConfirm: () => Promise<void> | void;
};
