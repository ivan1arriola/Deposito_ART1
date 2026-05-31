import type { PrestamoClase } from "./PrestamoClase";
import type { PrestamoDestinatarioTipo } from "./PrestamoDestinatarioTipo";
import type { PrestamoDraftItem } from "./PrestamoDraftItem";

export type PrestamoDraft = {
  clasePrestamo: PrestamoClase;
  destinatarioTipo: PrestamoDestinatarioTipo;
  destinatarioCi: string;
  destinatarioExternoGrado: string;
  destinatarioExternoNombre: string;
  destinatarioExternoApellido: string;
  destinatarioExternoCi: string;
  destinatarioExternoUnidadDestino: string;
  actuanteCi: string;
  fechaPrestamo: string;
  fechaEstimadaDevolucionTexto: string;
  comentarios: string;
  equipos: PrestamoDraftItem[];
};

export const EMPTY_PRESTAMO_DRAFT: PrestamoDraft = {
  clasePrestamo: "INTERNO",
  destinatarioTipo: "PERSONAL",
  destinatarioCi: "",
  destinatarioExternoGrado: "",
  destinatarioExternoNombre: "",
  destinatarioExternoApellido: "",
  destinatarioExternoCi: "",
  destinatarioExternoUnidadDestino: "",
  actuanteCi: "",
  fechaPrestamo: "",
  fechaEstimadaDevolucionTexto: "",
  comentarios: "",
  equipos: [{ equipoId: "", cantidad: "1", estadoEntrega: "NUEVO", comentarioEntrega: "" }],
};
