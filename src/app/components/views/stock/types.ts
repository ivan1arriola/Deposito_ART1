import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type {
  PrestamoDraft,
  PrestamoDraftItem,
  PrestamoEstadoEquipo,
  StockOperacionDraft,
  StockOperacionDraftItem,
} from "@/types/forms";
import type { StockDashboardData } from "@/types/views";

export type StockSection = "total" | "actual" | "alta" | "baja" | "historial" | "prestamos";

export type StockViewProps = {
  section: StockSection;
  data: StockDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  equipos: Equipo[];
  draft: StockOperacionDraft;
  saving: boolean;
  maxDate: string;
  onDraftChange: (field: "tipo" | "fecha" | "comentarios", value: string) => void;
  onDraftItemChange: (index: number, field: keyof StockOperacionDraftItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  prestamoDraft: PrestamoDraft;
  prestamoSaving: boolean;
  returningPrestamoId: string | null;
  onPrestamoDraftChange: (
    field:
      | "destinatarioTipo"
      | "destinatarioCi"
      | "actuanteCi"
      | "fechaPrestamo"
      | "fechaEstimadaDevolucionTexto"
      | "comentarios",
    value: string,
  ) => void;
  onPrestamoItemChange: (index: number, field: keyof PrestamoDraftItem, value: string) => void;
  onAddPrestamoItem: () => void;
  onRemovePrestamoItem: (index: number) => void;
  onSubmitPrestamo: () => void;
  onSubmitPrestamoAndPrint: () => void;
  onReturnPrestamo: (
    prestamoId: string,
    fechaDevolucion: string,
    items?: Array<{ itemId: string; estadoDevolucion: PrestamoEstadoEquipo; comentarioDevolucion?: string }>,
  ) => void;
  onReload: () => void;
};
