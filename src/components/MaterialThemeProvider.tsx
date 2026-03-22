"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import type { ReactNode } from "react";
import { appTheme } from "@/lib/mui-theme";
import { ThemeRegistry } from "@/components/ThemeRegistry";

export function MaterialThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeRegistry options={{ key: "mui" }}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeRegistry>
  );
}
