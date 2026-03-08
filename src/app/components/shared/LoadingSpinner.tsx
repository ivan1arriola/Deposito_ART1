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
};

type LoadingOverlayProps = {
  visible: boolean;
  label?: string;
};

const SIZE_CLASSES: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

const TONE_CLASSES: Record<NonNullable<LoadingSpinnerProps["tone"]>, string> = {
  dark: "border-stone-400 border-t-stone-700",
  light: "border-white/35 border-t-white",
};

export function LoadingSpinner({ size = "sm", tone = "dark", className }: LoadingSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className ?? ""}`.trim()}
    />
  );
}

export function LoadingInline({
  label,
  size = "sm",
  tone = "dark",
  className,
  textClassName,
}: LoadingInlineProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`.trim()} role="status" aria-live="polite">
      <LoadingSpinner size={size} tone={tone} />
      <span className={textClassName ?? "text-sm font-semibold text-stone-700"}>{label}</span>
    </span>
  );
}

export function LoadingOverlay({ visible, label = "Cargando..." }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[950] flex items-start justify-center pt-4 sm:pt-6">
      <div className="rounded-full border border-stone-300 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
        <LoadingInline label={label} size="sm" tone="dark" />
      </div>
    </div>
  );
}
