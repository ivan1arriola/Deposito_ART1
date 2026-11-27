"use client";

import { useState, type ReactNode } from "react";
import { Check, GripVertical, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import {
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  type SxProps,
  type Theme,
} from "@mui/material";

export interface ActionMenuItem {
  label: string;
  icon: "edit" | "trash" | "check" | "x" | "drag";
  tone: "primary" | "secondary" | "success" | "danger" | "neutral";
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Menú desplegable de acciones mejorado con iconos
 */
export function ActionMenu(props: {
  actions: ActionMenuItem[];
  buttonLabel?: string;
  compact?: boolean;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchorEl);

  const getIcon = (icon: string): ReactNode => {
    switch (icon) {
      case "edit":
        return <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "trash":
        return <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "check":
        return <Check className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "x":
        return <X className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case "drag":
        return <GripVertical className="h-4 w-4 shrink-0" aria-hidden="true" />;
      default:
        return null;
    }
  };

  const getToneSx = (tone: string): SxProps<Theme> => {
    switch (tone) {
      case "primary":
        return { color: "primary.main" };
      case "success":
        return { color: "success.main" };
      case "danger":
        return { color: "error.main" };
      case "secondary":
        return { color: "text.primary" };
      default:
        return { color: "text.secondary" };
    }
  };

  if (props.actions.length === 1 && !props.buttonLabel) {
    const action = props.actions[0];
    return (
      <Button
        onClick={action.onClick}
        disabled={action.disabled}
        variant="text"
        size={props.compact ? "small" : "medium"}
        startIcon={getIcon(action.icon)}
        sx={{ ...getToneSx(action.tone), minWidth: 0 }}
      >
        {action.label}
      </Button>
    );
  }

  return (
    <>
      {props.buttonLabel ? (
        <Button
          variant="outlined"
          size={props.compact ? "small" : "medium"}
          endIcon={<MoreVertical className="h-4 w-4 shrink-0" aria-hidden="true" />}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ borderColor: "var(--color-border-subtle)" }}
        >
          {props.buttonLabel}
        </Button>
      ) : (
        <IconButton
          size={props.compact ? "small" : "medium"}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label="Abrir menu de acciones"
          sx={{ border: "1px solid", borderColor: "var(--color-border-subtle)", borderRadius: 1.5 }}
        >
          <MoreVertical className="h-4 w-4 shrink-0" aria-hidden="true" />
        </IconButton>
      )}

      <Menu
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            border: "1px solid var(--color-border-subtle)",
            boxShadow: "var(--shadow-sm)",
          },
        }}
      >
        {props.actions.map((action, idx) => (
          <MenuItem
            key={`${action.label}-${idx}`}
            disabled={action.disabled}
            onClick={() => {
              action.onClick();
              setAnchorEl(null);
            }}
          >
            <ListItemIcon sx={getToneSx(action.tone)}>{getIcon(action.icon)}</ListItemIcon>
            <ListItemText primary={action.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
