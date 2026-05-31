import type { StockOperacionTipo } from "./StockOperacionTipo";
import type { StockOperacionDraftItem } from "./StockOperacionDraftItem";

export type StockOperacionDraft = {
  tipo: StockOperacionTipo;
  fecha: string;
  comentarios: string;
  equipos: StockOperacionDraftItem[];
};

export const EMPTY_STOCK_OPERACION_DRAFT: StockOperacionDraft = {
  tipo: "INGRESO",
  fecha: "",
  comentarios: "",
  equipos: [{ equipoId: "", cantidad: "1" }],
};
