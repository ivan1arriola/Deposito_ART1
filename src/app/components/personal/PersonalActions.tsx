"use client";

import { useId, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  setPendingMenuTrigger,
} from "@/components/ui/DropdownMenu";

type PersonalActionsProps = {
  canWrite: boolean;
  editing: boolean;
  tallasOpen: boolean;
  personLabel?: string;
  onToggleEdit: () => void;
  onDelete: () => void;
  onToggleTallas?: () => void;
  onEntrega: () => void;
  onDevolucion: () => void;
  onObservacion: () => void;
  onViewMoves: () => void;
  onOpenProfile: () => void;
  onOpenSheet: () => void;
};

const actionClass =
  "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800";

export function PersonalActions({
  canWrite,
  editing,
  tallasOpen,
  personLabel,
  onToggleEdit,
  onDelete,
  onToggleTallas,
  onEntrega,
  onDevolucion,
  onObservacion,
  onViewMoves,
  onOpenProfile,
  onOpenSheet,
}: PersonalActionsProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const didToggleRef = useRef(false);
  const suppressCloseFocusRef = useRef(false);

  const actions: { label: string; onSelect: () => void; danger?: boolean }[] = [
    ...(onToggleTallas
      ? [{ label: tallasOpen ? "Ocultar tallas" : "Ver tallas", onSelect: onToggleTallas }]
      : []),
    { label: "Ver movimientos", onSelect: onViewMoves },
    { label: "Hoja de entrega", onSelect: onOpenSheet },
    ...(canWrite
      ? [
          { label: "Devolución", onSelect: onDevolucion },
          { label: "Observación", onSelect: onObservacion },
          { label: editing ? "Cancelar edición" : "Editar", onSelect: onToggleEdit },
          { label: "Borrar", onSelect: onDelete, danger: true },
        ]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        className={actionClass + " text-[var(--color-ejercito-blue)] hover:bg-blue-50"}
        onClick={onOpenProfile}
        aria-label={personLabel ? "Ver ficha de " + personLabel : undefined}
      >
        Ver ficha
      </button>
      {canWrite ? (
        <button
          type="button"
          className={actionClass + " text-stone-800 hover:bg-stone-100"}
          onClick={onEntrega}
          aria-label={personLabel ? "Entrega a " + personLabel : undefined}
        >
          Entrega
        </button>
      ) : null}
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
          <button
            ref={triggerRef}
            id={menuId + "-trigger"}
            type="button"
            aria-label={personLabel ? "Más acciones para " + personLabel : "Más acciones"}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={() => {
              if (didToggleRef.current) {
                didToggleRef.current = false;
                return;
              }
              setOpen((prev) => !prev);
            }}
            className={
              actionClass +
              " min-w-11 justify-center border border-stone-300 bg-white text-stone-800 hover:bg-stone-100"
            }
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ···
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          id={menuId}
          aria-labelledby={menuId + "-trigger"}
          align="end"
          onCloseAutoFocus={(event) => {
            if (suppressCloseFocusRef.current) {
              event.preventDefault();
              suppressCloseFocusRef.current = false;
            }
          }}
        >
          {actions.map(({ label, onSelect, danger }) => (
            <DropdownMenuItem
              key={label}
              onSelect={() => {
                suppressCloseFocusRef.current = true;
                setPendingMenuTrigger(triggerRef.current);
                setOpen(false);
                onSelect();
              }}
              className={`min-h-[44px] ${
                danger ? "text-[var(--color-ejercito-red)] data-[highlighted]:text-red-800" : ""
              }`}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
