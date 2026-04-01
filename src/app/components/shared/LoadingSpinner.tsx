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
    <Stack direction="row" spacing={1.25} alignItems="center" className={className} role="status" aria-live="polite">
      {showSpinner ? <LoadingSpinner size={size} tone={tone} /> : null}
      <Typography variant="body2" fontWeight={600} className={textClassName} color={tone === "light" ? "common.white" : "text.primary"}>
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
        bgcolor: "rgba(12, 10, 9, 0.62)",
        backdropFilter: "blur(1.5px)",
        WebkitBackdropFilter: "blur(1.5px)",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        role="status"
        aria-live="polite"
        sx={{
          width: "min(92vw, 560px)",
          px: 3,
          py: 1.5,
          borderRadius: 20,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 12px 36px rgba(0,0,0,0.28)",
        }}
      >
        <LoadingSpinner size="sm" tone="dark" />
        <Typography variant="body2" fontWeight={700} sx={{ textAlign: "left" }}>
          {label}
        </Typography>
      </Stack>
    </Backdrop>
  );
}
