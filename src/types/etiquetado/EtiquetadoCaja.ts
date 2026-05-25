import type { EtiquetadoCajaCodigoSIE } from "./EtiquetadoCajaCodigoSIE";
import type { EtiquetadoCajaEquipo } from "./EtiquetadoCajaEquipo";

export type EtiquetadoCaja = {
  codigoDepositoGeneral: number;
  estanteria: string;
  piso: number;
  cantidad: number;
  equipos: EtiquetadoCajaEquipo[];
  itemNombres: string[];
  codigosSIE: EtiquetadoCajaCodigoSIE[];
  tallas: string[];
};
