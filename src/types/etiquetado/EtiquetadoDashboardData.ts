import type { EtiquetadoCaja } from "./EtiquetadoCaja";
import type { EtiquetadoCodigoSIE } from "./EtiquetadoCodigoSIE";
import type { EtiquetadoEstanteria } from "./EtiquetadoEstanteria";
import type { EtiquetadoEquipo } from "./EtiquetadoEquipo";

export type EtiquetadoDashboardData = {
  generatedAt: string;
  equipos: EtiquetadoEquipo[];
  estanterias: EtiquetadoEstanteria[];
  codigosSIE: EtiquetadoCodigoSIE[];
  cajas: EtiquetadoCaja[];
};
