/**
 * Handler functions para operaciones de usuarios administrador
 */

import { api } from "@/lib/api";
import type { Role } from "@/types/entities";

interface CallbackProps {
  onSuccess?: (data?: unknown) => void;
  onError?: (message: string) => void;
}

export type UsuarioProfileInput = {
  rangoId?: number | null;
  nombre: string;
  apellido: string;
  usuario: string;
  mailReferencia: string;
};

export async function createUsuarioHandler(
  input: UsuarioProfileInput & { password: string; rol: Role },
  callbacks: CallbackProps
) {
  try {
    await api("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rangoId: input.rangoId ?? null,
        nombre: input.nombre,
        apellido: input.apellido,
        usuario: input.usuario,
        password: input.password,
        mailReferencia: input.mailReferencia,
        rol: input.rol,
        activo: true,
      }),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function updateUsuarioProfileHandler(
  usuarioId: string,
  input: UsuarioProfileInput,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/usuarios/${usuarioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rangoId: input.rangoId,
        nombre: input.nombre,
        apellido: input.apellido,
        usuario: input.usuario,
        mailReferencia: input.mailReferencia,
      }),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function changeUserRoleHandler(
  usuarioId: string,
  rol: Role,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/usuarios/${usuarioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol }),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el rol.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function changeUserPasswordHandler(
  usuarioId: string,
  password: string,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/usuarios/${usuarioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la contraseña.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function toggleUserActiveHandler(
  usuarioId: string,
  newActive: boolean,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/usuarios/${usuarioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: newActive }),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el estado.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function confirmUserEmailHandler(usuarioId: string, callbacks: CallbackProps) {
  try {
    await api(`/api/usuarios/${usuarioId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmarMail: true }),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo confirmar el correo.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function deleteUsuarioHandler(usuarioId: string, callbacks: CallbackProps) {
  try {
    await api(`/api/usuarios/${usuarioId}`, { method: "DELETE" });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function saveFirmaConfigHandler(
  encargadoRango: string,
  encargadoNombre: string,
  oficialRango: string,
  oficialNombre: string,
  callbacks: CallbackProps & { onSave: (config: unknown) => void }
) {
  try {
    const updated = await api("/api/firma-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encargadoRango,
        encargadoNombre,
        oficialRango,
        oficialNombre,
      }),
    });
    callbacks.onSave(updated);
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la configuración.";
    callbacks.onError?.(message);
    throw error;
  }
}
