import type { StockOperacionTipo } from "./StockOperacionTipo";
import type { StockOperacionDraftEquipo } from "./StockOperacionDraftEquipo";

export type StockOperacionDraft = {
  tipo: StockOperacionTipo;
  fecha: string;
  comentarios: string;
  equipos: StockOperacionDraftEquipo[];
};

export const EMPTY_STOCK_OPERACION_DRAFT: StockOperacionDraft = {
  tipo: "INGRESO",
  fecha: "",
  comentarios: "",
  equipos: [{ equipoId: "", cantidad: "1" }],
};
