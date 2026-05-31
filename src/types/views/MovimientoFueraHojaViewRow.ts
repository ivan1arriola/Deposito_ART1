export type MovimientoFueraHojaViewRow = {
  movimientoId: string;
  fecha: string;
  tipo: "ENTREGA" | "DEVOLUCION";
  ci: string;
  persona: string;
  gradoAbreviacion: string;
  gradoOrden: number | null;
  equipo: string;
  cantidad: number;
  observaciones: string | null;
};
