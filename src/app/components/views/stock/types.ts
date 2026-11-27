import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type {
  PrestamoDraft,
  PrestamoDraftEquipo,
  PrestamoEstadoEquipo,
  StockOperacionDraft,
  StockOperacionDraftEquipo,
} from "@/types/forms";
import type { StockDashboardData } from "@/types/views";

export type StockSection = "total" | "actual" | "alta" | "baja" | "historial" | "prestamos";

export type StockViewProps = {
  section: StockSection;
  data: StockDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  isAdmin: boolean;
  equipos: Equipo[];
  draft: StockOperacionDraft;
  saving: boolean;
  maxDate: string;
  onDraftChange: (field: "tipo" | "fecha" | "comentarios", value: string) => void;
  onDraftItemChange: (index: number, field: keyof StockOperacionDraftEquipo, value: string) => void;
  onAddItem: () => void;
  onRemoveEquipo: (index: number) => void;
  onSubmit: () => void;
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  prestamoDraft: PrestamoDraft;
  prestamoSaving: boolean;
  returningPrestamoId: string | null;
  onPrestamoDraftChange: (
    field:
      | "clasePrestamo"
      | "destinatarioTipo"
      | "destinatarioCi"
      | "destinatarioExternoGrado"
      | "destinatarioExternoNombre"
      | "destinatarioExternoApellido"
      | "destinatarioExternoCi"
      | "destinatarioExternoUnidadDestino"
      | "actuanteCi"
      | "fechaPrestamo"
      | "fechaEstimadaDevolucionTexto"
      | "comentarios",
    value: string
  ) => void;
  onPrestamoItemChange: (index: number, field: keyof PrestamoDraftEquipo, value: string) => void;
  onAddPrestamoItem: () => void;
  onRemovePrestamoItem: (index: number) => void;
  onSubmitPrestamo: () => void;
  onSubmitPrestamoAndPrint: () => void;
  onReturnPrestamo: (
    prestamoId: string,
    fechaDevolucion: string,
    equipos?: Array<{
      equipoId: string;
      estadoDevolucion: PrestamoEstadoEquipo;
      comentarioDevolucion?: string;
    }>
  ) => void;
  onReload: () => void;
};
