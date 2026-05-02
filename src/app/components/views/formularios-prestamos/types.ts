import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type { PrestamoDraft, PrestamoDraftItem, PrestamoEstadoEquipo } from "@/types/forms";
import type { StockDashboardData } from "@/types/views";

export type PrestamosTab = "registrar" | "vigentes" | "historial";

export type PrestamoEditPayload = {
  fechaPrestamo: string;
  fechaEstimadaDevolucionTexto?: string;
  fechaDevolucion?: string;
  comentarios?: string;
  motivo: string;
  items: Array<{
    itemId: string;
    cantidad: number;
    estadoEntrega: PrestamoEstadoEquipo;
    comentarioEntrega?: string;
    estadoDevolucion?: PrestamoEstadoEquipo;
    comentarioDevolucion?: string;
  }>;
};

export type FormulariosPrestamosViewProps = {
  viewMode?: "integrado" | PrestamosTab;
  data: StockDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  isAdmin: boolean;
  equipos: Equipo[];
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  prestamoDraft: PrestamoDraft;
  prestamoSaving: boolean;
  returningPrestamoId: string | null;
  editingPrestamoId: string | null;
  maxDate: string;
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
  onEditPrestamo: (prestamoId: string, payload: PrestamoEditPayload) => Promise<void>;
  onDeletePrestamo: (prestamoId: string) => void;
  onReload: () => void;
};
