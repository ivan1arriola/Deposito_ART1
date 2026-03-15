/**
 * Handler functions para operaciones de personal
 */

import { api } from "@/lib/api";

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

export async function promoteSargentoToSuboficialHandler(
  ci: string,
  adminPassword: string,
  callbacks: CallbackProps
) {
  try {
    const data = await api(`/api/personal/${encodeURIComponent(ci)}/ascenso-sargento-primero`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassword }),
    });
    callbacks.onSuccess?.(data);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar el ascenso.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function createOficialSuboficialHandler(
  payload: unknown,
  callbacks: CallbackProps
) {
  try {
    await api("/api/oficiales-suboficiales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el personal oficial/suboficial.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function updateOficialSuboficialHandler(
  ci: string,
  payload: unknown,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/oficiales-suboficiales/${encodeURIComponent(ci)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el personal oficial/suboficial.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function createPersonalObservacionHandler(
  ci: string,
  payload: unknown,
  callbacks: CallbackProps
) {
  try {
    const data = await api(`/api/personal/${encodeURIComponent(ci)}/observaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar la observación.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function loadPersonalObservacionesHandler(
  ci: string,
  callbacks: CallbackProps
) {
  try {
    const data = await api(`/api/personal/${encodeURIComponent(ci)}/observaciones`);
    callbacks.onSuccess?.(data);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar las observaciones.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function updatePersonalObservacionHandler(
  ci: string,
  observacionId: string,
  payload: unknown,
  callbacks: CallbackProps
) {
  try {
    const data = await api(`/api/personal/${encodeURIComponent(ci)}/observaciones/${encodeURIComponent(observacionId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.(data);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la observación.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function deletePersonalObservacionHandler(
  ci: string,
  observacionId: string,
  callbacks: CallbackProps
) {
  try {
    const data = await api(`/api/personal/${encodeURIComponent(ci)}/observaciones/${encodeURIComponent(observacionId)}`, {
      method: "DELETE",
    });
    callbacks.onSuccess?.(data);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la observación.";
    callbacks.onError?.(message);
    throw error;
  }
}
