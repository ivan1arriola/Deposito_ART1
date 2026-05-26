import type { PrestamoHistorialTipo } from "./PrestamoHistorialTipo";
import type { RegistroTipo } from "./RegistroTipo";
import type { StockOperacionViewTipo } from "./StockOperacionViewTipo";

export type StockHistorialEntry = {
  id: string;
  fecha: string;
  createdAt: string;
  origen: "MANUAL" | "PERSONAL" | "RECINTO" | "PRESTAMO";
  tipo: StockOperacionViewTipo | RegistroTipo | PrestamoHistorialTipo;
  afectaStock: boolean;
  comentarios: string | null;
  totalUnidades: number;
  ci: string | null;
  persona: string | null;
  registradoPor: string | null;
  items: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    delta: number;
  }>;
};
