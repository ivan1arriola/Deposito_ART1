"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PrestamoDraft, PrestamoDraftItem, StockOperacionDraft, StockOperacionDraftItem } from "@/types/forms";

type UseStockPrestamoDraftItemsParams = {
  setStockDraft: Dispatch<SetStateAction<StockOperacionDraft>>;
  setPrestamoDraft: Dispatch<SetStateAction<PrestamoDraft>>;
  onStatusChange: (status: string) => void;
};

export function useStockPrestamoDraftItems({
  setStockDraft,
  setPrestamoDraft,
  onStatusChange,
}: UseStockPrestamoDraftItemsParams) {
  const updateStockDraftItem = useCallback(
    (index: number, field: keyof StockOperacionDraftItem, value: string) => {
      setStockDraft((prev) => {
        if (field === "itemId" && value !== "" && prev.items.some((item, itemIndex) => itemIndex !== index && item.itemId === value)) {
          onStatusChange("Ese equipo ya fue seleccionado en este movimiento de stock.");
          return prev;
        }
        return {
          ...prev,
          items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
        };
      });
    },
    [onStatusChange, setStockDraft],
  );

  const addStockDraftItem = useCallback(() => {
    setStockDraft((prev) => ({ ...prev, items: [...prev.items, { itemId: "", cantidad: "1" }] }));
  }, [setStockDraft]);

  const removeStockDraftItem = useCallback(
    (index: number) => {
      setStockDraft((prev) => {
        if (prev.items.length <= 1) return prev;
        return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
      });
    },
    [setStockDraft],
  );

  const updatePrestamoDraftItem = useCallback(
    (index: number, field: keyof PrestamoDraftItem, value: string) => {
      setPrestamoDraft((prev) => {
        if (field === "itemId" && value !== "" && prev.items.some((item, itemIndex) => itemIndex !== index && item.itemId === value)) {
          onStatusChange("Ese equipo ya fue seleccionado en este prestamo.");
          return prev;
        }
        return {
          ...prev,
          items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
        };
      });
    },
    [onStatusChange, setPrestamoDraft],
  );

  const addPrestamoDraftItem = useCallback(() => {
    setPrestamoDraft((prev) => ({ ...prev, items: [...prev.items, { itemId: "", cantidad: "1", estadoEntrega: "NUEVO", comentarioEntrega: "" }] }));
  }, [setPrestamoDraft]);

  const removePrestamoDraftItem = useCallback(
    (index: number) => {
      setPrestamoDraft((prev) => {
        if (prev.items.length <= 1) return prev;
        return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
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