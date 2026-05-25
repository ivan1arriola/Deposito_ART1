import type { StockOperacionTipo } from "./StockOperacionTipo";
import type { StockOperacionDraftItem } from "./StockOperacionDraftItem";

export type StockOperacionDraft = {
  tipo: StockOperacionTipo;
  fecha: string;
  comentarios: string;
  items: StockOperacionDraftItem[];
};

export const EMPTY_STOCK_OPERACION_DRAFT: StockOperacionDraft = {
  tipo: "INGRESO",
  fecha: "",
  comentarios: "",
  items: [{ itemId: "", cantidad: "1" }],
};
