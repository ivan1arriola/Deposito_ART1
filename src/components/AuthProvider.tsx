"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/hoja-de-entrega/")) {
    return <>{children}</>;
  }

  return (
    <SessionProvider basePath="/api/auth" refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}
