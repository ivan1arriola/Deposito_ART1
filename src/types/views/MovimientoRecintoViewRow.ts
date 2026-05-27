import type { TipoMovimiento } from "@/generated/prisma/client";

export type MovimientoRecintoViewRow = {
  movimientoId: string;
  fecha: string;
  tipo: TipoMovimiento;
  clase: "INTERNO" | "EXTERNO";
  nombre: string;
  item: string;
  cantidad: number;
  observaciones: string | null;
  usuarioEntrega: string | null;
};
