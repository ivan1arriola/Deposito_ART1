"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent(
  {
    className = "",
    side = "right",
    align = "start",
    sideOffset = 8,
    collisionPadding = 12,
    ...props
  },
  ref
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={`z-[1300] min-w-[230px] max-w-[280px] rounded-xl border border-white/15 bg-[rgba(22,28,22,0.98)] p-2.5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.4)] focus:outline-none ${className}`}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
