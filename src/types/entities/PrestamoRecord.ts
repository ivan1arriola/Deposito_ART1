import type { PrestamoDestinatarioTipo } from "./PrestamoDestinatarioTipo";
import type { PrestamoItem } from "./PrestamoItem";

export type PrestamoRecord = {
  prestamoId: string;
  reciboNumero: string;
  clasePrestamo: "INTERNO" | "EXTERNO" | "PENDIENTE";
  destinatarioTipo: PrestamoDestinatarioTipo | "EXTERNO" | null;
  destinatarioCi: string | null;
  perfilCi: string | null;
  destinatarioNombre: string;
  destinatarioEtiqueta: string;
  destinatarioGrado: string | null;
  destinatarioUnidadDestino: string | null;
  usuarioEntregaId: string;
  usuarioEntregaNombre: string;
  actuanteCi: string | null;
  actuanteNombre: string | null;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  usuarioRecibeDevolucionId: string | null;
  usuarioRecibeDevolucionNombre: string | null;
  comentarios: string | null;
  estado: "PENDIENTE" | "DEVUELTO";
  items: PrestamoItem[];
};
