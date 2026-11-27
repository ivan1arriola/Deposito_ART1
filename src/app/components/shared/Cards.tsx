"use client";

import { type ReactNode } from "react";

/**
 * Card mejorado con variantes y sombra
 */
export function Card(props: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}) {
  const { variant = "default", padding = "md", hover = false } = props;

  const paddingClass = {
    none: "p-0",
    sm: "p-3",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  const variantClass = {
    default:
      "bg-[var(--color-neutral-0)] border border-[var(--color-neutral-300)] shadow-[var(--shadow-xs)]",
    elevated:
      "bg-[var(--color-neutral-0)] border border-[var(--color-neutral-300)] shadow-[var(--shadow-sm)]",
    outlined: "bg-[var(--color-neutral-0)] border-2 border-[var(--color-neutral-300)] shadow-none",
  };

  return (
    <div
      className={`rounded-xl transition-[box-shadow,border-color] duration-150 ${
        variantClass[variant] ?? variantClass.default
      } ${paddingClass[padding] ?? paddingClass.md} ${
        hover ? "hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]" : ""
      } ${props.className ?? ""}`}
    >
      {props.children}
    </div>
  );
}

/**
 * Badge component
 */
export function Badge(props: {
  children: ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { variant = "default", size = "md" } = props;

  const sizeClass = {
    sm: "h-6 px-2 text-xs",
    md: "h-7 px-3 text-[13px]",
    lg: "h-8 px-3.5 text-[13px]",
  };

  const toneClass = {
    default:
      "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)]",
    success: "bg-[rgb(31_103_40/14%)] text-[var(--color-text-primary)] border-[rgb(31_103_40/40%)]",
    error: "bg-[rgb(207_15_33/14%)] text-[var(--color-text-primary)] border-[rgb(207_15_33/40%)]",
    warning:
      "bg-[rgb(255_204_0/24%)] text-[var(--color-ejercito-black)] border-[rgb(255_204_0/45%)]",
    info: "bg-[rgb(27_117_170/14%)] text-[var(--color-text-primary)] border-[rgb(27_117_170/40%)]",
  } as const;

  return (
    <span
      className={`inline-flex max-w-full items-center justify-center rounded-full border font-bold leading-none ${
        sizeClass[size]
      } ${toneClass[variant]} ${props.className ?? ""}`}
    >
      <span className="truncate">{props.children}</span>
    </span>
  );
}
