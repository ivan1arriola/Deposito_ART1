/**
 * Hook personalizado para manejar operaciones de autenticación
 */

import { useCallback } from "react";
import { api } from "@/lib/api";
import type { CurrentUser } from "@/types/entities";

interface UseAuthHandlersProps {
  onLoginSuccess: (user: CurrentUser) => void;
  onLoginError: (message: string) => void;
  onLogoutSuccess: () => void;
}

export function useAuthHandlers({ onLoginSuccess, onLoginError, onLogoutSuccess }: UseAuthHandlersProps) {
  const handleLogin = useCallback(
    async (username: string, password: string) => {
      try {
        const result = await api<CurrentUser>("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        onLoginSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo iniciar sesión.";
        onLoginError(message);
        throw error;
      }
    },
    [onLoginSuccess, onLoginError]
  );

  const handleLogout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
      onLogoutSuccess();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      onLogoutSuccess();
    }
  }, [onLogoutSuccess]);

  return { handleLogin, handleLogout };
}
