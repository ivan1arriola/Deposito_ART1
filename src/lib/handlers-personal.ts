/**
 * Handler functions para operaciones de personal
 */

import { api } from "@/lib/api";
import type { PersonalForm } from "@/types/forms";

interface CallbackProps {
  onSuccess?: (data?: unknown) => void;
  onError?: (message: string) => void;
}

export async function createPersonalHandler(
  payload: unknown,
  callbacks: CallbackProps
) {
  try {
    await api("/api/personal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el personal.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function updatePersonalHandler(
  ci: string,
  payload: unknown,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/personal/${encodeURIComponent(ci)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el personal.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function deletePersonalHandler(
  ci: string,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/personal/${encodeURIComponent(ci)}`, { method: "DELETE" });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el personal.";
    callbacks.onError?.(message);
    throw error;
  }
}
