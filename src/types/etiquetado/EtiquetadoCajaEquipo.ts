import type { EtiquetadoCajaCodigoSIE } from "./EtiquetadoCajaCodigoSIE";

export type EtiquetadoCajaEquipo = {
  itemId: string;
  itemNombre: string;
  cantidad: number;
  codigosSIE: EtiquetadoCajaCodigoSIE[];
  sinCodigo: boolean;
};
