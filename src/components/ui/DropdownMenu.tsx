"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

let pendingMenuTrigger: HTMLElement | null = null;
let clearPendingTimer: number | null = null;

export function setPendingMenuTrigger(element: HTMLElement | null) {
  pendingMenuTrigger = element;
  if (typeof window !== "undefined") {
    if (clearPendingTimer !== null) {
      window.clearTimeout(clearPendingTimer);
    }
    clearPendingTimer = window.setTimeout(() => {
      pendingMenuTrigger = null;
      clearPendingTimer = null;
    }, 50);
  }
}

export function consumePendingMenuTrigger(): HTMLElement | null {
  const trigger = pendingMenuTrigger;
  pendingMenuTrigger = null;
  if (typeof window !== "undefined" && clearPendingTimer !== null) {
    window.clearTimeout(clearPendingTimer);
    clearPendingTimer = null;
  }
  return trigger;
}

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent(
  { className = "", sideOffset = 6, align = "end", collisionPadding = 12, ...props },
  ref
) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        collisionPadding={collisionPadding}
        className={`z-[700] min-w-[11rem] max-w-[calc(100vw-24px)] max-h-[min(72dvh,560px)] overflow-y-auto rounded-xl border border-[var(--color-border-subtle)] bg-white p-1.5 shadow-[var(--shadow-md)] focus:outline-none ${className}`}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(function DropdownMenuItem({ className = "", ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={`flex min-h-[42px] cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-800 outline-none transition-colors data-[highlighted]:bg-[rgb(0_56_133/9%)] data-[highlighted]:text-stone-950 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
      {...props}
    />
  );
});
