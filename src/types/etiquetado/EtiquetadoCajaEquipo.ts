import type { EtiquetadoCajaCodigoSIE } from "./EtiquetadoCajaCodigoSIE";

export type EtiquetadoCajaEquipo = {
  equipoId: string;
  equipoNombre: string;
  cantidad: number;
  codigosSIE: EtiquetadoCajaCodigoSIE[];
  sinCodigo: boolean;
};
