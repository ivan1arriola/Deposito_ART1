"use client";

import { Backdrop, CircularProgress, Stack, Typography } from "@mui/material";

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

const SIZE_PX: Record<NonNullable<LoadingSpinnerProps["size"]>, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
};

const TONE_COLOR: Record<NonNullable<LoadingSpinnerProps["tone"]>, "inherit" | "primary"> = {
  dark: "primary",
  light: "inherit",
};

export function LoadingSpinner({ size = "sm", tone = "dark", className }: LoadingSpinnerProps) {
  return (
    <CircularProgress
      aria-hidden="true"
      color={TONE_COLOR[tone]}
      size={SIZE_PX[size]}
      thickness={4.6}
      className={className}
    />
  );
}

export function LoadingInline({
  label,
  size = "sm",
  tone = "dark",
  className,
  textClassName,
  showSpinner = false,
}: LoadingInlineProps) {
  return (
    <Stack
      component="span"
      direction="row"
      spacing={1.25}
      alignItems="center"
      className={className}
      role="status"
      aria-live="polite"
      sx={{ display: "inline-flex" }}
    >
      {showSpinner ? <LoadingSpinner size={size} tone={tone} /> : null}
      <Typography
        component="span"
        variant="body2"
        fontWeight={600}
        className={textClassName}
        color={tone === "light" ? "common.white" : "text.primary"}
      >
        {label}
      </Typography>
    </Stack>
  );
}

export function LoadingOverlay({ visible, label = "Cargando..." }: LoadingOverlayProps) {
  return (
    <Backdrop
      open={visible}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 1,
        bgcolor: "var(--color-overlay-dim)",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        role="status"
        aria-live="polite"
        sx={{
          width: "fit-content",
          maxWidth: "min(92vw, 500px)",
          px: 2.25,
          py: 1.2,
          borderRadius: 1.5,
          bgcolor: "var(--color-surface-base)",
          border: "1px solid",
          borderColor: "var(--color-border-subtle)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <LoadingSpinner size="sm" tone="dark" />
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ textAlign: "left", lineHeight: 1.25, whiteSpace: "pre-line" }}
        >
          {label}
        </Typography>
      </Stack>
    </Backdrop>
  );
}
