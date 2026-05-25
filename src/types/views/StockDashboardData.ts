import type { PrestamoStockEntry } from "./PrestamoStockEntry";
import type { StockHistorialEntry } from "./StockHistorialEntry";
import type { StockResumenRow } from "./StockResumenRow";

export type StockDashboardData = {
  generatedAt: string;
  resumen: StockResumenRow[];
  historial: StockHistorialEntry[];
  prestamos: PrestamoStockEntry[];
};
