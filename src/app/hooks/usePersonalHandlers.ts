/**
 * Hook personalizado para manejar operaciones de personal
 */

import { useCallback } from "react";
import { api } from "@/lib/api";
import type { Personal } from "@/types/entities";

interface UsePersonalHandlersProps {
  onSuccess: (data: Personal[]) => void;
  onError?: (message: string) => void;
}

export function usePersonalHandlers({ onSuccess, onError }: UsePersonalHandlersProps) {
  const handleCreate = useCallback(
    async (payload: unknown) => {
      try {
        const result = await api<Personal[]>("/api/personal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear el personal.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  const handleUpdate = useCallback(
    async (ci: string, payload: unknown) => {
      try {
        const result = await api<Personal[]>(`/api/personal/${encodeURIComponent(ci)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo actualizar el personal.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  const handleDelete = useCallback(
    async (ci: string) => {
      try {
        const result = await api<Personal[]>(`/api/personal/${encodeURIComponent(ci)}`, {
          method: "DELETE",
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar el personal.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  return { handleCreate, handleUpdate, handleDelete };
}
