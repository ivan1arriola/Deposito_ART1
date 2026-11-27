"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, GripVertical, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  setPendingMenuTrigger,
} from "@/components/ui/DropdownMenu";

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
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const didToggleRef = useRef(false);
  const suppressCloseFocusRef = useRef(false);

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

  const getToneClass = (tone: string): string => {
    switch (tone) {
      case "primary":
        return "text-[var(--color-ejercito-blue)]";
      case "success":
        return "text-[var(--color-ejercito-green)]";
      case "danger":
        return "text-[var(--color-ejercito-red)]";
      case "secondary":
        return "text-[var(--color-text-primary)]";
      default:
        return "text-[var(--color-text-secondary)]";
    }
  };

  if (props.actions.length === 1 && !props.buttonLabel) {
    const action = props.actions[0];
    return (
      <button
        type="button"
        onClick={action.onClick}
        disabled={action.disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 ${
          props.compact ? "min-h-9 text-xs" : "min-h-10 text-sm"
        } font-semibold transition-colors hover:bg-[rgb(0_56_133/6%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:pointer-events-none disabled:opacity-50 ${getToneClass(
          action.tone
        )}`}
      >
        {getIcon(action.icon)}
        <span>{action.label}</span>
      </button>
    );
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        didToggleRef.current = true;
        setOpen(nextOpen);
        queueMicrotask(() => {
          didToggleRef.current = false;
        });
      }}
    >
      <DropdownMenuTrigger asChild>
        {props.buttonLabel ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (didToggleRef.current) {
                didToggleRef.current = false;
                return;
              }
              setOpen((prev) => !prev);
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-white/80 font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-ejercito-blue)] hover:bg-[rgb(0_56_133/6%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
              props.compact ? "min-h-9 px-3 text-xs" : "min-h-10 px-4 text-sm"
            }`}
          >
            <span>{props.buttonLabel}</span>
            <MoreVertical className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (didToggleRef.current) {
                didToggleRef.current = false;
                return;
              }
              setOpen((prev) => !prev);
            }}
            aria-label="Abrir menú de acciones"
            className={`inline-flex items-center justify-center rounded-md border border-[var(--color-border-subtle)] bg-white/80 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-ejercito-blue)] hover:bg-[rgb(0_56_133/6%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
              props.compact ? "h-9 w-9" : "h-10 w-10"
            }`}
          >
            <MoreVertical className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          if (suppressCloseFocusRef.current) {
            event.preventDefault();
            suppressCloseFocusRef.current = false;
          }
        }}
      >
        {props.actions.map((action, idx) => (
          <DropdownMenuItem
            key={`${action.label}-${idx}`}
            disabled={action.disabled}
            onSelect={() => {
              suppressCloseFocusRef.current = true;
              setPendingMenuTrigger(triggerRef.current);
              setOpen(false);
              action.onClick();
            }}
          >
            <span className={`inline-flex shrink-0 ${getToneClass(action.tone)}`}>
              {getIcon(action.icon)}
            </span>
            <span className="flex-1 text-sm text-[var(--color-text-primary)]">{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
