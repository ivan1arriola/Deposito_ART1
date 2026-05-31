import type { EtiquetadoCajaCodigoSIE } from "./EtiquetadoCajaCodigoSIE";

export type EtiquetadoCajaEquipo = {
  equipoId: string;
  itemNombre: string;
  cantidad: number;
  codigosSIE: EtiquetadoCajaCodigoSIE[];
  sinCodigo: boolean;
};
