/**
 * Handler functions para autenticación
 */

import { signIn, signOut } from "next-auth/react";
import { api } from "@/lib/api";

interface CallbackProps {
  onSuccess?: (data?: unknown) => void;
  onError?: (message: string) => void;
}

export type PasswordResetRequestResponse = {
  ok: true;
  code: string | null;
  expiresAt: string | null;
  username: string | null;
};

export async function loginHandler(
  username: string,
  password: string,
  callbacks: CallbackProps,
) {
  try {
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      const message = result.error === "CredentialsSignin" ? "Credenciales inválidas" : result.error;
      callbacks.onError?.(message);
      throw new Error(message);
    }

    if (result?.ok) {
      callbacks.onSuccess?.();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar sesión.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function logoutHandler(callbacks: CallbackProps) {
  try {
    await signOut({ redirect: false });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  } finally {
    callbacks.onSuccess?.();
  }
}

export async function requestPasswordResetHandler(
  usernameOrEmail: string,
  callbacks: CallbackProps,
) {
  try {
    const result = await api<PasswordResetRequestResponse>("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernameOrEmail }),
    });
    callbacks.onSuccess?.(result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el código.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function changePasswordHandler(
  payload: { currentPassword: string; newPassword: string },
  callbacks: CallbackProps,
) {
  try {
    await api("/api/auth/password-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cambiar la contraseña.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function checkDbInitHandler(): Promise<{
  needsInit: boolean;
  userCount: number;
}> {
  try {
    return await api<{ needsInit: boolean; userCount: number }>("/api/db-init");
  } catch {
    return { needsInit: false, userCount: 0 };
  }
}

export async function initializeDatabaseHandler(callbacks: CallbackProps) {
  try {
    const result = await api<{
      initialized: boolean;
      message: string;
      credentials?: { username: string; password: string; email: string };
    }>("/api/db-init", { method: "POST" });
    callbacks.onSuccess?.(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo inicializar la base de datos.";
    callbacks.onError?.(message);
    throw error;
  }
}
