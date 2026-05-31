export type StockEquipoTraceData = {
  equipoId: string;
  /** @deprecated Usar `equipoId`. */
  equipoId: string;
  itemNombre: string;
  totals: {
    subalternos: number;
    prestamo: number;
    recinto: number;
  };
  subalternos: Array<{
    ci: string;
    persona: string;
    bateria: string | null;
    tipoPersonal: "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
    cantidadNeta: number;
    movimientos: Array<{
      movimientoId: string;
      tipo: "ENTREGA" | "DEVOLUCION";
      fecha: string;
      cantidad: number;
      delta: number;
      observaciones: string | null;
    }>;
  }>;
  recintos: Array<{
    recintoNombre: string;
    cantidadNeta: number;
    movimientos: Array<{
      movimientoId: string;
      fecha: string;
      cantidad: number;
      delta: number;
      observaciones: string | null;
    }>;
  }>;
  prestamos: Array<{
    prestamoId: string;
    reciboNumero: string;
    clasePrestamo: "INTERNO" | "EXTERNO" | "PENDIENTE";
    estado: "PENDIENTE" | "DEVUELTO";
    fechaPrestamo: string;
    destinatarioCi: string | null;
    perfilCi: string | null;
    destinatarioEtiqueta: string;
    destinatarioUnidadDestino: string | null;
    observaciones: string | null;
    cantidad: number;
    movimientoId: string;
  }>;
};
