/**
 * Handler functions para operaciones de registros de movimientos
 */

import { api } from "@/lib/api";
import type { RegistroView } from "@/types/views";

interface CallbackProps {
  onSuccess?: (data?: unknown) => void;
  onError?: (message: string) => void;
}

interface RegistroPayload {
  ci?: string;
  ciList?: string[];
  destinatarioTipo?: "PERSONAL" | "RECINTO" | "EXTERNO";
  recintoClase?: "INTERNO" | "EXTERNO";
  recintoNombre?: string;
  destinatarioExterno?: {
    grado?: string;
    nombre?: string;
    apellido?: string;
    ci?: string;
    unidadDestino?: string;
  };
  tipo: "ENTREGA" | "DEVOLUCION" | "ASIGNACION" | "AJUSTE";
  afectaStock?: boolean;
  fecha: string;
  comentarios?: string;
  equipos: Array<{ equipoId: string; cantidad: number }>;
}

interface SaveRegistroOptions extends CallbackProps {
  onSaved?: () => void;
  onRegistroUpdated?: () => void;
}

export async function createRegistroHandler(payload: RegistroPayload, callbacks: CallbackProps) {
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
 * Valida y guarda un registro (crea o actualiza)
 */
export async function saveRegistroHandler(
  payload: RegistroPayload,
  registroId: string | null,
  callbacks: SaveRegistroOptions
) {
  try {
    // Validar equipos
    const uniqueItemIds = new Set(payload.equipos.map((equipo) => equipo.equipoId));
    if (uniqueItemIds.size !== payload.equipos.length) {
      const message = "No puedes repetir equipos en un mismo movimiento.";
      callbacks.onError?.(message);
      throw new Error(message);
    }

    const isRectificacion = registroId !== null;
    await api(isRectificacion ? `/api/registros/${registroId}` : "/api/registros", {
      method: isRectificacion ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    callbacks.onSuccess?.();
    callbacks.onSaved?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el movimiento.";
    callbacks.onError?.(message);
    throw error;
  }
}
