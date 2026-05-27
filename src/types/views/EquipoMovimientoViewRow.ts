export type EquipoMovimientoViewRow = {
  movimientoId: string;
  fecha: string;
  tipo: "ENTREGA" | "DEVOLUCION" | "ASIGNACION" | "PRESTAMO";
  tipoLabel: string;
  prestamoEstado: "PENDIENTE" | "DEVUELTO" | null;
  clasePrestamo: "INTERNO" | "EXTERNO" | "PENDIENTE" | null;
  ci: string | null;
  perfilCi: string | null;
  persona: string;
  gradoAbreviacion: string;
  gradoOrden: number | null;
  cantidad: number;
  observaciones: string | null;
};
