"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PrestamoDraft, PrestamoDraftEquipo, StockOperacionDraft, StockOperacionDraftEquipo } from "@/types/forms";

type UseStockPrestamoDraftItemsParams = {
  setStockDraft: Dispatch<SetStateAction<StockOperacionDraft>>;
  setPrestamoDraft: Dispatch<SetStateAction<PrestamoDraft>>;
  onStatusChange: (status: string) => void;
};

export function useStockPrestamoDraftEquipos({
  setStockDraft,
  setPrestamoDraft,
  onStatusChange,
}: UseStockPrestamoDraftItemsParams) {
  const updateStockDraftItem = useCallback(
    (index: number, field: keyof StockOperacionDraftEquipo, value: string) => {
      setStockDraft((prev) => {
        if (field === "equipoId" && value !== "" && prev.equipos.some((equipo, equipoIndex) => equipoIndex !== index && equipo.equipoId === value)) {
          onStatusChange("Ese equipo ya fue seleccionado en este movimiento de stock.");
          return prev;
        }
        return {
          ...prev,
          equipos: prev.equipos.map((equipo, equipoIndex) => (equipoIndex === index ? { ...equipo, [field]: value } : equipo)),
        };
      });
    },
    [onStatusChange, setStockDraft],
  );

  const addStockDraftItem = useCallback(() => {
    setStockDraft((prev) => ({ ...prev, equipos: [...prev.equipos, { equipoId: "", cantidad: "1" }] }));
  }, [setStockDraft]);

  const removeStockDraftItem = useCallback(
    (index: number) => {
      setStockDraft((prev) => {
        if (prev.equipos.length <= 1) return prev;
        return { ...prev, equipos: prev.equipos.filter((_, equipoIndex) => equipoIndex !== index) };
      });
    },
    [setStockDraft],
  );

  const updatePrestamoDraftItem = useCallback(
    (index: number, field: keyof PrestamoDraftEquipo, value: string) => {
      setPrestamoDraft((prev) => {
        if (field === "equipoId" && value !== "" && prev.equipos.some((equipo, equipoIndex) => equipoIndex !== index && equipo.equipoId === value)) {
          onStatusChange("Ese equipo ya fue seleccionado en este préstamo.");
          return prev;
        }
        return {
          ...prev,
          equipos: prev.equipos.map((equipo, equipoIndex) => (equipoIndex === index ? { ...equipo, [field]: value } : equipo)),
        };
      });
    },
    [onStatusChange, setPrestamoDraft],
  );

  const addPrestamoDraftItem = useCallback(() => {
    setPrestamoDraft((prev) => ({ ...prev, equipos: [...prev.equipos, { equipoId: "", cantidad: "1", estadoEntrega: "NUEVO", comentarioEntrega: "" }] }));
  }, [setPrestamoDraft]);

  const removePrestamoDraftItem = useCallback(
    (index: number) => {
      setPrestamoDraft((prev) => {
        if (prev.equipos.length <= 1) return prev;
        return { ...prev, equipos: prev.equipos.filter((_, equipoIndex) => equipoIndex !== index) };
      });
    },
    [setPrestamoDraft],
  );

  return {
    updateStockDraftItem,
    addStockDraftItem,
    removeStockDraftItem,
    updatePrestamoDraftItem,
    addPrestamoDraftItem,
    removePrestamoDraftItem,
  };
}