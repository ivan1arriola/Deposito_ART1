/**
 * Hook personalizado para manejar operaciones CRUD de catálogos
 * (Rangos, Baterías, Items)
 */

import { useCallback } from "react";
import { api } from "@/lib/api";

interface UseCatalogHandlersProps<T> {
  endpoint: string;
  onSuccess: (data: T[]) => void;
  onError?: (message: string) => void;
}

export function useCatalogHandlers<T extends { id?: string | number }>({
  endpoint,
  onSuccess,
  onError,
}: UseCatalogHandlersProps<T>) {
  const handleCreate = useCallback(
    async (payload: unknown) => {
      try {
        const result = await api<T[]>(`/api/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear el elemento.";
        onError?.(message);
        throw error;
      }
    },
    [endpoint, onSuccess, onError]
  );

  const handleUpdate = useCallback(
    async (id: string | number, payload: unknown) => {
      try {
        const result = await api<T[]>(`/api/${endpoint}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo actualizar el elemento.";
        onError?.(message);
        throw error;
      }
    },
    [endpoint, onSuccess, onError]
  );

  const handleDelete = useCallback(
    async (id: string | number) => {
      try {
        const result = await api<T[]>(`/api/${endpoint}/${id}`, {
          method: "DELETE",
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar el elemento.";
        onError?.(message);
        throw error;
      }
    },
    [endpoint, onSuccess, onError]
  );

  return { handleCreate, handleUpdate, handleDelete };
}
