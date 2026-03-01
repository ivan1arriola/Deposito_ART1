/**
 * Handler functions para operaciones de catálogos (Rangos, Baterías, Equipos)
 * Estas funciones contienen la lógica de negocio envuelta con API y side effects
 */

import { api } from "@/lib/api";
import type { Rango, Bateria, Item } from "@/types/entities";

type EquipoCodigoInput = {
  codigo: string;
  aclaracion: string;
};

interface CallbackProps {
  onSuccess: (data?: unknown) => void;
  onError: (message: string) => void;
}

// ==================== RANGOS ====================

export async function createRangoHandler(
  abreviacion: string,
  nombreCompleto: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    await api("/api/rangos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abreviacion, nombreCompleto, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el grado.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateRangoHandler(
  rangoId: number,
  abreviacion: string,
  nombreCompleto: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/rangos/${rangoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abreviacion, nombreCompleto, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el grado.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteRangoHandler(rangoId: number, callbacks: CallbackProps) {
  try {
    await api(`/api/rangos/${rangoId}`, { method: "DELETE" });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el grado.";
    callbacks.onError(message);
    throw error;
  }
}

// ==================== BATERIAS ====================

export async function createBateriaHandler(nombre: string, orden: number | undefined, callbacks: CallbackProps) {
  try {
    await api("/api/baterias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la batería.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateBateriaHandler(
  bateriaId: number,
  nombre: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/baterias/${bateriaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la batería.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteBateriaHandler(bateriaId: number, callbacks: CallbackProps) {
  try {
    await api(`/api/baterias/${bateriaId}`, { method: "DELETE" });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la batería.";
    callbacks.onError(message);
    throw error;
  }
}

// ==================== ITEMS ====================

export async function createItemHandler(
  nombre: string,
  activo: boolean,
  codigos: EquipoCodigoInput[],
  callbacks: CallbackProps
) {
  try {
    await api("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, activo, codigos }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateItemHandler(
  itemId: string,
  nombre: string,
  activo: boolean,
  ordenPdf: number,
  codigos: EquipoCodigoInput[] | undefined,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, activo, ordenPdf, codigos }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteItemHandler(itemId: string, callbacks: CallbackProps) {
  try {
    await api(`/api/items/${itemId}`, { method: "DELETE" });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateMultipleItemOrdersHandler(
  updates: Array<{ itemId: string; nombre: string; activo: boolean; ordenPdf: number }>,
  callbacks: CallbackProps
) {
  try {
    await Promise.all(
      updates.map((item) =>
        api(`/api/items/${item.itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        })
      )
    );
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el orden de PDF.";
    callbacks.onError(message);
    throw error;
  }
}
