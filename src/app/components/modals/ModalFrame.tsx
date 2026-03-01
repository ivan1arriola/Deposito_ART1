"use client";

import type { ReactNode } from "react";

type ModalFrameProps = {
  children: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  size?: "md" | "lg" | "xl";
};

const sizeClassMap = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
} as const;

export function ModalFrame({ children, onClose, closeOnBackdrop = true, size = "md" }: ModalFrameProps) {
  return (
    <section
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-3"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <article
        className={`w-full ${sizeClassMap[size]} rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </article>
    </section>
  );
}
