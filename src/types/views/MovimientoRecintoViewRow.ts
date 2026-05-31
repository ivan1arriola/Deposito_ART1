import type { TipoMovimiento } from "@/generated/prisma/client";

export type MovimientoRecintoViewRow = {
  movimientoId: string;
  fecha: string;
  tipo: TipoMovimiento;
  clase: "INTERNO" | "EXTERNO";
  nombre: string;
  equipos: { equipo: string; cantidad: number }[];
  observaciones: string | null;
  usuarioEntrega: string | null;
  responsableInfo?: {
    ci: string;
    grado: string;
    nombre: string;
    apellido: string;
  };
};
