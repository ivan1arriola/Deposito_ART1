"use client";

import { type ReactNode } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

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
      boxShadow: "0 8px 20px rgb(0 0 0 / 10%)",
    },
    elevated: {
      bgcolor: "background.paper",
      border: "1px solid",
      borderColor: "divider",
      boxShadow: 3,
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
      sx={{
        borderRadius: 3,
        transition: "transform 180ms ease, box-shadow 180ms ease",
        ...(variantSx[variant] ?? variantSx.default),
        ...(paddingSx[padding] ?? paddingSx.md),
        ...(hover
          ? {
              "&:hover": {
                boxShadow: 6,
                transform: "translateY(-2px)",
              },
            }
          : null),
      }}
    >
      {props.children}
    </Paper>
  );
}

/**
 * Card header con título y descripción
 */
export function CardHeader(props: {
  title: string;
  description?: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {props.title}
          </Typography>
          {props.badge}
        </Stack>
        {props.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {props.description}
          </Typography>
        )}
      </Box>
      {props.action && <Box sx={{ flexShrink: 0 }}>{props.action}</Box>}
    </Stack>
  );
}

/**
 * Stat card para mostrar métricas
 */
export function StatCard(props: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
}) {
  return (
    <Paper
      className={props.className}
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 1,
        transition: "box-shadow 180ms ease",
        "&:hover": { boxShadow: 3 },
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary", fontWeight: 700 }}>
            {props.label}
          </Typography>
          <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>
            {props.value}
          </Typography>
          
          {props.trend && (
            <Typography
              variant="caption"
              sx={{
                mt: 1,
                display: "inline-block",
                fontWeight: 700,
                color:
                  props.trend.direction === "up"
                    ? "success.main"
                    : props.trend.direction === "down"
                      ? "error.main"
                      : "text.secondary",
              }}
            >
                {props.trend.value > 0 ? "+" : ""}{props.trend.value}% {props.trend.label}
            </Typography>
          )}
        </Box>
        
        {props.icon && (
          <Box sx={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 2, bgcolor: "action.hover", color: "text.secondary" }}>
            {props.icon}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

/**
 * Empty state component
 */
export function EmptyState(props: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 2,
        border: "2px dashed",
        borderColor: "divider",
        bgcolor: "action.hover",
        px: 3,
        py: 6,
        textAlign: "center",
      }}
    >
      {props.icon && (
        <Box sx={{ mb: 2, display: "grid", placeItems: "center", width: 64, height: 64, borderRadius: "50%", bgcolor: "divider", color: "text.secondary" }}>
          {props.icon}
        </Box>
      )}
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{props.title}</Typography>
      {props.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{props.description}</Typography>
      )}
      {props.action && <Box sx={{ mt: 2 }}>{props.action}</Box>}
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
}) {
  const { variant = "default", size = "md" } = props;

  const colorByVariant = {
    default: "default",
    success: "success",
    error: "error",
    warning: "warning",
    info: "info",
  } as const;

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

  return (
    <Chip
      label={props.children}
      size={sizeByVariant[size]}
      color={colorByVariant[variant]}
      className={props.className}
      sx={{ borderRadius: 999, fontWeight: 700, ...paddingSx[size] }}
    />
  );
}
