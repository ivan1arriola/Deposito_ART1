"use client";

import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => undefined;
      }
      const mediaQuery = window.matchMedia(query);
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", onStoreChange);
        return () => mediaQuery.removeEventListener("change", onStoreChange);
      }
      mediaQuery.addListener(onStoreChange);
      return () => mediaQuery.removeListener(onStoreChange);
    },
    () => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
      }
      return window.matchMedia(query).matches;
    },
    () => false
  );
}
