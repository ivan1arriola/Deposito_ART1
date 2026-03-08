/**
 * Custom hook para encapsular lógica de handlers de registros
 */

import { useCallback } from "react";
import type { RegistroDraft, RegistroDraftItem } from "@/types/forms";
import type { RegistroViewerState } from "@/types/views";
import {
  loadRegistroViewerHandler,
  saveRegistroHandler,
} from "@/lib/handlers-registros";

interface RegistroHandlers {
  loadRegistroViewer: (ci: string, nombre: string) => Promise<void>;
  saveRegistro: (
    registroDraft: RegistroDraft,
    registroViewer: RegistroViewerState | null,
    registroSaving: boolean
  ) => Promise<void>;
  updateRegistroItem: (
    registroDraft: RegistroDraft | null,
    index: number,
    field: keyof RegistroDraftItem,
    value: string
  ) => RegistroDraft | null;
  addRegistroItem: (registroDraft: RegistroDraft | null) => RegistroDraft | null;
  removeRegistroItem: (registroDraft: RegistroDraft | null, index: number) => RegistroDraft | null;
}

export function useRegistroHandlers(
  onRegistroViewerUpdate: (state: Omit<RegistroViewerState, "nombre" | "ci"> & { ci: string; nome: string }) => void,
  onRegistroSaved: () => void,
  onStatusUpdate: (message: string) => void,
  onLoadData: () => Promise<void>
): RegistroHandlers {
  const loadRegistroViewer = useCallback(
    async (ci: string, nombre: string) => {
      try {
        await loadRegistroViewerHandler(ci, nombre, {
          onLoad: (state) => {
            onRegistroViewerUpdate({
              ci,
              nome: nombre,
              ...state,
            });
          },
          onError: (message) => {
            onStatusUpdate(message);
          },
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [onRegistroViewerUpdate, onStatusUpdate]
  );

  const saveRegistro = useCallback(
    async (
      registroDraft: RegistroDraft,
      registroViewer: RegistroViewerState | null,
      registroSaving: boolean
    ) => {
      if (registroSaving) return;

      const payloadEquipos = registroDraft.items
        .map((item) => ({
          itemId: item.itemId.trim(),
          cantidad: Number(item.cantidad),
        }))
        .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

      if (payloadEquipos.length === 0) {
        onStatusUpdate("Debes agregar al menos un equipo con cantidad válida.");
        return;
      }

      const uniqueItemIds = new Set(payloadEquipos.map((item) => item.itemId));
      if (uniqueItemIds.size !== payloadEquipos.length) {
        onStatusUpdate("No puedes repetir equipos en un mismo movimiento.");
        return;
      }

      try {
        const isRectificacion = registroDraft.modo === "rectificar" && registroDraft.registroId !== null;
        onStatusUpdate(isRectificacion ? "Actualizando rectificación..." : "Registrando movimiento...");

        await saveRegistroHandler(
          {
            ci: registroDraft.ci,
            tipo: registroDraft.tipo,
            fecha: registroDraft.fecha,
            comentarios: registroDraft.comentarios.trim() || undefined,
            items: payloadEquipos,
          },
          registroDraft.registroId,
          {
            onSuccess: async () => {
              onStatusUpdate(
                isRectificacion
                  ? `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolución"} rectificada.`
                  : `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolución"} registrada.`
              );
              onRegistroSaved();
              await onLoadData();
              if (registroViewer && registroViewer.ci === registroDraft.ci) {
                await loadRegistroViewer(registroViewer.ci, registroViewer.nombre);
              }
            },
            onError: (message) => {
              onStatusUpdate(message);
            },
          }
        );
      } catch {
        // Error manejado en el handler
      }
    },
    [loadRegistroViewer, onStatusUpdate, onRegistroSaved, onLoadData]
  );

  const updateRegistroItem = useCallback(
    (
      registroDraft: RegistroDraft | null,
      index: number,
      field: keyof RegistroDraftItem,
      value: string
    ): RegistroDraft | null => {
      if (!registroDraft) return null;
      
      if (
        field === "itemId" &&
        value !== "" &&
        registroDraft.items.some(
          (item, itemIndex) => itemIndex !== index && item.itemId === value
        )
      ) {
        onStatusUpdate("Ese equipo ya fue seleccionado en este movimiento.");
        return registroDraft;
      }

      return {
        ...registroDraft,
        items: registroDraft.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      };
    },
    [onStatusUpdate]
  );

  const addRegistroItem = useCallback(
    (registroDraft: RegistroDraft | null): RegistroDraft | null => {
      if (!registroDraft) return null;
      return {
        ...registroDraft,
        items: [...registroDraft.items, { itemId: "", cantidad: "1" }],
      };
    },
    []
  );

  const removeRegistroItem = useCallback(
    (registroDraft: RegistroDraft | null, index: number): RegistroDraft | null => {
      if (!registroDraft) return null;
      if (registroDraft.items.length <= 1) return registroDraft;
      return {
        ...registroDraft,
        items: registroDraft.items.filter((_, itemIndex) => itemIndex !== index),
      };
    },
    []
  );

  return {
    loadRegistroViewer,
    saveRegistro,
    updateRegistroItem,
    addRegistroItem,
    removeRegistroItem,
  };
}
