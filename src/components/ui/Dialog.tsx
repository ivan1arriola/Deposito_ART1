"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { createContext, forwardRef, useCallback, useContext, useLayoutEffect, useRef } from "react";

type DialogFocusContextValue = {
  restoreFocus: () => boolean;
};

const DialogFocusContext = createContext<DialogFocusContextValue | null>(null);

export function Dialog({ open, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (open && !wasOpenRef.current) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        previousFocusRef.current = active;
      }
    }
    wasOpenRef.current = Boolean(open);
  }, [open]);

  const restoreFocus = useCallback(() => {
    const target = previousFocusRef.current;
    previousFocusRef.current = null;
    if (target && target.isConnected) {
      target.focus();
      return true;
    }
    return false;
  }, []);

  return (
    <DialogFocusContext.Provider value={{ restoreFocus }}>
      <DialogPrimitive.Root open={open} {...props} />
    </DialogFocusContext.Provider>
  );
}

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

type DialogVariant = "modal" | "search" | "drawer-left" | "drawer-bottom";

type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  variant?: DialogVariant;
};

const CONTENT_CLASSES: Record<DialogVariant, string> = {
  modal:
    "fixed left-1/2 top-1/2 z-[1250] w-[calc(100%-24px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-[var(--shadow-md)] focus:outline-none",
  search:
    "fixed left-1/2 top-8 z-[1250] w-[calc(100%-24px)] max-w-[600px] -translate-x-1/2 overflow-hidden rounded-[20px] border border-black/10 bg-white/95 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.02)] backdrop-blur-xl focus:outline-none sm:top-20",
  "drawer-left":
    "fixed inset-y-0 left-0 z-[1250] flex w-[min(88vw,300px)] flex-col overflow-y-auto border-r border-white/10 bg-[rgba(15,20,15,0.98)] p-4 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-xl focus:outline-none",
  "drawer-bottom":
    "fixed inset-x-0 bottom-0 z-[1250] max-h-[82vh] overflow-y-auto rounded-t-2xl border border-[rgba(107,119,93,0.3)] bg-[linear-gradient(180deg,rgba(252,254,249,0.98)_0%,rgba(236,242,228,0.96)_100%)] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(20,28,19,0.2)] focus:outline-none",
};

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  { variant = "modal", className = "", onCloseAutoFocus, children, ...props },
  ref
) {
  const focusContext = useContext(DialogFocusContext);

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[1240] bg-[var(--color-overlay-dim)] backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        ref={ref}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && focusContext?.restoreFocus()) {
            event.preventDefault();
          }
        }}
        className={`${CONTENT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
