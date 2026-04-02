"use client";

import type { ReactNode } from "react";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { Box, Button, Card as MuiCard, CardContent, Pagination, Stack, TextField, Typography } from "@mui/material";

export { toast } from "sonner";
export { ActionMenu } from "./ActionMenu";
export type { ActionMenuItem } from "./ActionMenu";
export { ConfirmDialog } from "./ConfirmDialog";
export { Input, Select, Textarea } from "./FormInputs";
export { Card, CardHeader, StatCard, EmptyState, Badge } from "./Cards";
export { LoadingSpinner, LoadingInline, LoadingOverlay } from "./LoadingSpinner";

export function CatalogCard(props: {
  title: string;
  placeholder: string;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onCreate: () => void;
  createDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <MuiCard variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{props.title}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
          value={props.newValue}
          onChange={(event) => props.onNewValueChange(event.target.value)}
          placeholder={props.placeholder}
        />
          <Button type="button" onClick={props.onCreate} disabled={props.createDisabled} variant="contained">
            Crear
          </Button>
        </Stack>
        <Box sx={{ mt: 2 }}>{props.children}</Box>
      </CardContent>
    </MuiCard>
  );
}

export function SmallActionButton(props: {
  text: string;
  tone: "edit" | "delete" | "ok" | "neutral";
  onClick: () => void;
  className?: string;
  icon?: "edit" | "trash" | "check" | "x";
}) {
  const colorByTone = {
    edit: "primary",
    delete: "error",
    ok: "success",
    neutral: "secondary",
  } as const;

  const getIcon = () => {
    const iconMap = {
      edit: "edit",
      delete: "trash",
      ok: "check",
      neutral: "x",
    } as const;
    const icon = props.icon || iconMap[props.tone];

    switch (icon) {
      case "edit":
        return <EditOutlinedIcon fontSize="small" />;
      case "trash":
        return <DeleteOutlineRoundedIcon fontSize="small" />;
      case "check":
        return <CheckRoundedIcon fontSize="small" />;
      case "x":
        return <CloseRoundedIcon fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Button
      type="button"
      onClick={props.onClick}
      size="small"
      variant={props.tone === "neutral" ? "outlined" : "contained"}
      color={colorByTone[props.tone]}
      startIcon={getIcon()}
      className={props.className}
      sx={{
        borderRadius: 1.5,
        minHeight: 32,
        borderColor: props.tone === "neutral" ? "var(--color-border-strong)" : undefined,
      }}
    >
      {props.text}
    </Button>
  );
}

export function PaginationControls(props: {
  page: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(props.totalItems / props.pageSize));
  const safePage = Math.max(1, Math.min(props.page, totalPages));
  const from = props.totalItems === 0 ? 0 : (safePage - 1) * props.pageSize + 1;
  const to = props.totalItems === 0 ? 0 : Math.min(safePage * props.pageSize, props.totalItems);

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
      sx={{ border: "1px solid", borderColor: "divider", bgcolor: "var(--color-surface-muted)", borderRadius: 1.5, p: 1.5 }}
      className={props.className}
    >
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        Mostrando {from} a {to} de {props.totalItems} {props.itemLabel}
        {props.totalItems !== 1 ? "s" : ""}
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
        {props.onPageSizeChange && props.pageSizeOptions ? (
          <TextField
            select
            SelectProps={{ native: true }}
            size="small"
            value={props.pageSize}
            onChange={(event) => props.onPageSizeChange?.(Number(event.target.value))}
            sx={{ minWidth: 120 }}
          >
            {props.pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}/pagina
              </option>
            ))}
          </TextField>
        ) : null}

        <Pagination
          page={safePage}
          count={totalPages}
          onChange={(_, page) => props.onPageChange(page)}
          color="primary"
          shape="rounded"
          size="small"
          showFirstButton
          showLastButton
        />
      </Stack>
    </Stack>
  );
}
