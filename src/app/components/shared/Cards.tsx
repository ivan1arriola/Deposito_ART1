"use client";

import { type ReactNode } from "react";
import { Chip, Paper, type SxProps, type Theme } from "@mui/material";

/**
 * Card mejorado con variantes y sombra
 */
export function Card(props: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  sx?: SxProps<Theme>;
}) {
  const { variant = "default", padding = "md", hover = false } = props;

  const paddingSx = {
    none: { p: 0 },
    sm: { p: 1.5 },
    md: { p: { xs: 2, sm: 3 } },
    lg: { p: { xs: 3, sm: 4 } },
  };

  const variantSx = {
    default: {
      bgcolor: "background.paper",
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "var(--shadow-xs)",
    },
    elevated: {
      bgcolor: "background.paper",
      border: "1px solid",
      borderColor: "divider",
      boxShadow: "var(--shadow-sm)",
    },
    outlined: {
      bgcolor: "background.paper",
      border: "2px solid",
      borderColor: "divider",
      boxShadow: 0,
    },
  };

  return (
    <Paper
      className={props.className}
      sx={[
        {
          borderRadius: 3,
          transition: "box-shadow 160ms ease, border-color 160ms ease",
          ...(variantSx[variant] ?? variantSx.default),
          ...(paddingSx[padding] ?? paddingSx.md),
          ...(hover
            ? {
                "&:hover": {
                  boxShadow: "var(--shadow-sm)",
                  borderColor: "var(--color-border-strong)",
                },
              }
            : null),
        },
        ...(Array.isArray(props.sx) ? props.sx : props.sx ? [props.sx] : []),
      ]}
    >
      {props.children}
    </Paper>
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
  sx?: SxProps<Theme>;
}) {
  const { variant = "default", size = "md" } = props;

  const sizeByVariant = {
    sm: "small",
    md: "medium",
    lg: "medium",
  } as const;

  const paddingSx = {
    sm: { px: 0.5 },
    md: { px: 0.75 },
    lg: { px: 1 },
  };

  const toneSx = {
    default: {
      bgcolor: "var(--color-surface-muted)",
      color: "var(--color-text-primary)",
      borderColor: "var(--color-border-subtle)",
    },
    success: {
      bgcolor: "rgb(31 103 40 / 14%)",
      color: "var(--color-text-primary)",
      borderColor: "rgb(31 103 40 / 40%)",
    },
    error: {
      bgcolor: "rgb(207 15 33 / 14%)",
      color: "var(--color-text-primary)",
      borderColor: "rgb(207 15 33 / 40%)",
    },
    warning: {
      bgcolor: "rgb(255 204 0 / 24%)",
      color: "var(--color-ejercito-black)",
      borderColor: "rgb(255 204 0 / 45%)",
    },
    info: {
      bgcolor: "rgb(27 117 170 / 14%)",
      color: "var(--color-text-primary)",
      borderColor: "rgb(27 117 170 / 40%)",
    },
  } as const;

  return (
    <Chip
      label={props.children}
      size={sizeByVariant[size]}
      color="default"
      className={props.className}
      sx={[
        {
          borderRadius: 999,
          fontWeight: 700,
          border: "1px solid",
          ...paddingSx[size],
          ...toneSx[variant],
        },
        ...(Array.isArray(props.sx) ? props.sx : props.sx ? [props.sx] : []),
      ]}
    />
  );
}
