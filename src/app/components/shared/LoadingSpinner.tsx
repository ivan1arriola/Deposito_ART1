"use client";

type LoadingSpinnerProps = {
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "dark" | "light";
  className?: string;
};

type LoadingInlineProps = {
  label: string;
  size?: LoadingSpinnerProps["size"];
  tone?: LoadingSpinnerProps["tone"];
  className?: string;
  textClassName?: string;
  showSpinner?: boolean;
};

type LoadingOverlayProps = {
  visible: boolean;
  label?: string;
};

const SIZE_CLASS: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-[18px] w-[18px]",
  md: "h-[22px] w-[22px]",
  lg: "h-7 w-7",
};

const TONE_CLASS: Record<NonNullable<LoadingSpinnerProps["tone"]>, string> = {
  dark: "text-[var(--color-ejercito-blue)]",
  light: "text-white",
};

export function LoadingSpinner({
  size = "sm",
  tone = "dark",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin shrink-0 ${SIZE_CLASS[size]} ${TONE_CLASS[tone]} ${className}`}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingInline({
  label,
  size = "sm",
  tone = "dark",
  className = "",
  textClassName = "",
  showSpinner = false,
}: LoadingInlineProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      {showSpinner ? <LoadingSpinner size={size} tone={tone} /> : null}
      <span
        className={`text-sm font-semibold ${
          tone === "light"
            ? "text-[var(--color-ejercito-white)]"
            : "text-[var(--color-text-primary)]"
        } ${textClassName}`}
      >
        {label}
      </span>
    </span>
  );
}

export function LoadingOverlay({ visible, label = "Cargando..." }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[1301] flex items-center justify-center bg-[var(--color-overlay-dim)] px-4 backdrop-blur-[2px]"
      aria-modal="true"
      role="dialog"
      aria-label={label}
    >
      <div
        role="status"
        aria-live="polite"
        className="flex w-fit max-w-[min(92vw,500px)] items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-4 py-2.5 shadow-[var(--shadow-sm)]"
      >
        <LoadingSpinner size="sm" tone="dark" />
        <p className="whitespace-pre-line text-left text-sm font-bold leading-tight text-[var(--color-text-primary)]">
          {label}
        </p>
      </div>
    </div>
  );
}
