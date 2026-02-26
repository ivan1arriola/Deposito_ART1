/**
 * Hook personalizado para manejar operaciones de usuarios administrador
 */

import { useCallback } from "react";
import { api } from "@/lib/api";
import type { UsuarioAdmin, Role } from "@/types/entities";

interface UseUsuarioHandlersProps {
  onSuccess: (data: UsuarioAdmin[]) => void;
  onError?: (message: string) => void;
}

export function useUsuarioHandlers({ onSuccess, onError }: UseUsuarioHandlersProps) {
  const handleCreate = useCallback(
    async (payload: unknown) => {
      try {
        const result = await api<UsuarioAdmin[]>("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  const handleChangeRole = useCallback(
    async (usuarioId: string, newRole: Role) => {
      try {
        const result = await api<UsuarioAdmin[]>(`/api/usuarios/${usuarioId}/rol`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rol: newRole }),
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo cambiar el rol.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  const handleToggleActive = useCallback(
    async (usuarioId: string) => {
      try {
        const result = await api<UsuarioAdmin[]>(`/api/usuarios/${usuarioId}/activo`, {
          method: "PATCH",
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo cambiar el estado.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  const handleResetPassword = useCallback(
    async (usuarioId: string) => {
      try {
        await api(`/api/usuarios/${usuarioId}/reset-password`, {
          method: "POST",
        });
        onSuccess([]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo reiniciar la contraseña.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  const handleDelete = useCallback(
    async (usuarioId: string) => {
      try {
        const result = await api<UsuarioAdmin[]>(`/api/usuarios/${usuarioId}`, {
          method: "DELETE",
        });
        onSuccess(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario.";
        onError?.(message);
        throw error;
      }
    },
    [onSuccess, onError]
  );

  return {
    handleCreate,
    handleChangeRole,
    handleToggleActive,
    handleResetPassword,
    handleDelete,
  };
}
