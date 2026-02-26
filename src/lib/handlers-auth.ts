/**
 * Handler functions para autenticación
 */

import { api } from "@/lib/api";
import type { CurrentUser } from "@/types/entities";

interface CallbackProps {
  onSuccess?: (data?: unknown) => void;
  onError?: (message: string) => void;
}

export async function loginHandler(
  username: string,
  password: string,
  callbacks: CallbackProps
) {
  try {
    await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar sesión.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function logoutHandler(callbacks: CallbackProps) {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  } finally {
    callbacks.onSuccess?.();
  }
}
