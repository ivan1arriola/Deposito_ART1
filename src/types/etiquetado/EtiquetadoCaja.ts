import type { EtiquetadoCajaCodigoSIE } from "./EtiquetadoCajaCodigoSIE";
import type { EtiquetadoCajaEquipo } from "./EtiquetadoCajaEquipo";

export type EtiquetadoCaja = {
  codigoDepositoGeneral: number;
  estanteria: string;
  piso: number;
  cantidad: number;
  equipos: EtiquetadoCajaEquipo[];
  equipoNombres: string[];
  codigosSIE: EtiquetadoCajaCodigoSIE[];
  tallas: string[];
};
