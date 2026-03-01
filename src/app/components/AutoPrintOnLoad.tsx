"use client";

import { useEffect } from "react";

export function AutoPrintOnLoad() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => window.print(), 180);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}
