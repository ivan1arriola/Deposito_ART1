/**
 * Handler functions para operaciones de registros de movimientos
 */

import { api } from "@/lib/api";
import type { RegistroView, RegistroViewerState } from "@/types/views";

interface CallbackProps {
  onSuccess?: (data?: unknown) => void;
  onError?: (message: string) => void;
}

interface RegistroPayload {
  ci: string;
  tipo: "ENTREGA" | "DEVOLUCION" | "AJUSTE";
  afectaStock?: boolean;
  fecha: string;
  comentarios?: string;
  items: Array<{ itemId: string; cantidad: number }>;
}

interface SaveRegistroOptions extends CallbackProps {
  onSaved?: () => void;
  onRegistroUpdated?: () => void;
}

export async function createRegistroHandler(
  payload: RegistroPayload,
  callbacks: CallbackProps
) {
  try {
    await api("/api/registros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo registrar el movimiento.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function updateRegistroHandler(
  registroId: string,
  payload: RegistroPayload,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/registros/${registroId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el movimiento.";
    callbacks.onError?.(message);
    throw error;
  }
}

export async function loadRegistrosHandler(
  ci: string,
  callbacks: CallbackProps & { onLoad: (registros: RegistroView[]) => void }
) {
  try {
    const registros = await api<RegistroView[]>(
      `/api/registros?ci=${encodeURIComponent(ci)}&limit=200`
    );
    callbacks.onLoad(registros);
    callbacks.onSuccess?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar los movimientos.";
    callbacks.onError?.(message);
    throw error;
  }
}

/**
 * Carga el historial de registros para el visor (con información personal)
 */
export async function loadRegistroViewerHandler(
  ci: string,
  nombre: string,
  callbacks: CallbackProps & { 
    onLoad: (state: Omit<RegistroViewerState, "nombre" | "ci">) => void 
  }
) {
  try {
    const registros = await api<RegistroView[]>(
      `/api/registros?ci=${encodeURIComponent(ci)}&limit=200`
    );
    callbacks.onLoad({
      loading: false,
      error: null,
      registros,
    });
    callbacks.onSuccess?.();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo cargar el historial.";
    callbacks.onLoad({
      loading: false,
      error: message,
      registros: [],
    });
    callbacks.onError?.(message);
  }
}

/**
 * Valida y guarda un registro (crea o actualiza)
 */
export async function saveRegistroHandler(
  payload: RegistroPayload,
  registroId: string | null,
  callbacks: SaveRegistroOptions
) {
  try {
    // Validar items
    const uniqueItemIds = new Set(payload.items.map((item) => item.itemId));
    if (uniqueItemIds.size !== payload.items.length) {
      const message = "No puedes repetir equipos en un mismo movimiento.";
      callbacks.onError?.(message);
      throw new Error(message);
    }

    const isRectificacion = registroId !== null;
    await api(
      isRectificacion ? `/api/registros/${registroId}` : "/api/registros",
      {
        method: isRectificacion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    callbacks.onSuccess?.();
    callbacks.onSaved?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el movimiento.";
    callbacks.onError?.(message);
    throw error;
  }
}
