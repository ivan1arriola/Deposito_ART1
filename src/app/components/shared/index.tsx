"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button, Pagination, Stack, TextField, Typography } from "@mui/material";

export { toast } from "sonner";
export { ActionMenu } from "./ActionMenu";
export { Card, Badge } from "./Cards";
export { LoadingInline, LoadingOverlay } from "./LoadingSpinner";

export function SmallActionButton(props: {
  text: string;
  tone: "edit" | "delete" | "ok" | "neutral";
  onClick: () => void;
  className?: string;
  icon?: "edit" | "trash" | "check" | "x";
}) {
  const toneSx = {
    edit: {
      color: "var(--color-ejercito-white)",
      border: "1px solid #002f70",
      background: "linear-gradient(180deg, rgba(0,56,133,0.98) 0%, rgba(0,42,102,0.98) 100%)",
      "&:hover": {
        background: "linear-gradient(180deg, rgba(0,47,112,0.98) 0%, rgba(0,36,86,0.98) 100%)",
      },
    },
    delete: {
      color: "var(--color-ejercito-white)",
      border: "1px solid rgba(94,26,21,0.95)",
      background: "linear-gradient(180deg, rgba(149,46,36,0.98) 0%, rgba(107,31,24,0.98) 100%)",
      "&:hover": {
        background: "linear-gradient(180deg, rgba(127,38,30,0.98) 0%, rgba(88,24,18,0.98) 100%)",
      },
    },
    ok: {
      color: "var(--color-ejercito-white)",
      border: "1px solid #184f1f",
      background: "linear-gradient(180deg, rgba(31,103,40,0.98) 0%, rgba(22,76,30,0.98) 100%)",
      "&:hover": {
        background: "linear-gradient(180deg, rgba(25,85,34,0.98) 0%, rgba(18,60,24,0.98) 100%)",
      },
    },
    neutral: {
      color: "var(--color-text-primary)",
      border: "1px solid rgba(95,86,61,0.34)",
      background: "linear-gradient(180deg, rgba(246,243,233,0.96) 0%, rgba(231,226,210,0.94) 100%)",
      "&:hover": {
        background:
          "linear-gradient(180deg, rgba(237,233,219,0.96) 0%, rgba(223,217,198,0.94) 100%)",
      },
    },
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
        return <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "trash":
        return <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "check":
        return <Check className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "x":
        return <X className="h-4 w-4 shrink-0" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <Button
      type="button"
      onClick={props.onClick}
      size="small"
      variant="contained"
      color="inherit"
      disableElevation
      startIcon={getIcon()}
      className={props.className}
      sx={{
        borderRadius: 1.5,
        minHeight: 32,
        fontWeight: 700,
        textTransform: "none",
        boxShadow: "none",
        ...toneSx[props.tone],
        "&.Mui-disabled": {
          color: "rgba(23,33,43,0.56)",
          borderColor: "rgba(95,86,61,0.18)",
          background:
            "linear-gradient(180deg, rgba(234,230,216,0.7) 0%, rgba(219,214,198,0.76) 100%)",
        },
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
      sx={{
        border: "1px solid rgba(95,86,61,0.2)",
        bgcolor: "transparent",
        background:
          "linear-gradient(180deg, rgba(247,244,234,0.84) 0%, rgba(230,226,211,0.92) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.36)",
        borderRadius: 2.5,
        p: 1.5,
      }}
      className={props.className}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.5, color: "var(--color-text-secondary)" }}
      >
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
            sx={{
              minWidth: 120,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                background:
                  "linear-gradient(180deg, rgba(250,248,240,0.96) 0%, rgba(237,233,220,0.94) 100%)",
              },
            }}
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
          sx={{
            "& .MuiPaginationItem-root": {
              minWidth: 32,
              height: 32,
              color: "var(--color-text-primary)",
              fontWeight: 700,
              border: "1px solid rgba(95,86,61,0.18)",
              background: "rgba(249,247,239,0.78)",
            },
            "& .MuiPaginationItem-root:hover": {
              background: "rgba(94,107,72,0.12)",
              borderColor: "rgba(94,107,72,0.28)",
            },
            "& .MuiPaginationItem-root.Mui-selected": {
              color: "var(--color-ejercito-black)",
              borderColor: "rgba(145,111,26,0.78)",
              background:
                "linear-gradient(180deg, rgba(255,210,74,0.98) 0%, rgba(214,170,38,0.98) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.38)",
            },
            "& .MuiPaginationItem-root.Mui-selected:hover": {
              background:
                "linear-gradient(180deg, rgba(242,198,62,0.98) 0%, rgba(196,154,28,0.98) 100%)",
            },
          }}
        />
      </Stack>
    </Stack>
  );
}
