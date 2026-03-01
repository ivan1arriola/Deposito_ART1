"use client";

import { useCallback } from "react";
import { signIn, signOut } from "next-auth/react";

interface UseAuthHandlersProps {
  onLoginSuccess: () => void;
  onLoginError: (message: string) => void;
  onLogoutSuccess: () => void;
}

export function useAuthHandlers({ onLoginSuccess, onLoginError, onLogoutSuccess }: UseAuthHandlersProps) {
  const handleLogin = useCallback(
    async (username: string, password: string) => {
      try {
        const result = await signIn("credentials", {
          username,
          password,
          redirect: false,
        });

        if (result?.error) {
          const message = result.error === "CredentialsSignin" ? "Credenciales invalidas" : result.error;
          onLoginError(message);
          throw new Error(message);
        }

        if (result?.ok) {
          onLoginSuccess();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo iniciar sesion.";
        onLoginError(message);
        throw error;
      }
    },
    [onLoginError, onLoginSuccess],
  );

  const handleLogout = useCallback(async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      onLogoutSuccess();
    }
  }, [onLogoutSuccess]);

  return { handleLogin, handleLogout };
}
