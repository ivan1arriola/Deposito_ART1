import type { TipoMovimiento } from "@/generated/prisma/client";

export type MovimientoRecintoViewRow = {
  movimientoId: string;
  fecha: string;
  tipo: TipoMovimiento;
  clase: "INTERNO" | "EXTERNO";
  nombre: string;
  equipos: { equipo: string; cantidad: number }[];
  articulos?: {
    articuloId: number;
    articulo: string;
    tipo: string;
    cantidad: number;
    comentario?: string | null;
  }[];
  anulado?: boolean;
  anuladoAt?: string | null;
  observaciones: string | null;
  usuarioEntrega: string | null;
  responsableInfo?: {
    ci: string;
    grado: string;
    nombre: string;
    apellido: string;
  };
};
