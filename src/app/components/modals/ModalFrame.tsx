"use client";

import type { ReactNode } from "react";

type ModalFrameProps = {
  children: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  size?: "md" | "lg" | "xl";
  zIndexClassName?: string;
};

const sizeClassMap = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
} as const;

export function ModalFrame({
  children,
  onClose,
  closeOnBackdrop = true,
  size = "md",
  zIndexClassName = "z-[500]",
}: ModalFrameProps) {
  return (
    <section
      className={`fixed inset-0 ${zIndexClassName} flex items-end justify-center overflow-y-auto bg-black/45 px-2 pb-2 pt-8 sm:items-center sm:px-3`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <article
        className={`max-h-[calc(100dvh-0.75rem)] w-full ${sizeClassMap[size]} overflow-y-auto overscroll-contain rounded-[28px] border border-stone-300 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </article>
    </section>
  );
}
