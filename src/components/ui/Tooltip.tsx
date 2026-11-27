"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent(
  { className = "", side = "right", sideOffset = 8, collisionPadding = 8, ...props },
  ref
) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={`z-[1350] rounded-md bg-[var(--color-neutral-800)] px-2.5 py-1.5 text-xs font-medium leading-tight text-white shadow-[var(--shadow-sm)] select-none ${className}`}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
