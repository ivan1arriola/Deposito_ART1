import type { EtiquetadoCaja } from "./EtiquetadoCaja";
import type { EtiquetadoCodigoSIE } from "./EtiquetadoCodigoSIE";
import type { EtiquetadoEstanteria } from "./EtiquetadoEstanteria";
import type { EtiquetadoItem } from "./EtiquetadoItem";

export type EtiquetadoDashboardData = {
  generatedAt: string;
  items: EtiquetadoItem[];
  estanterias: EtiquetadoEstanteria[];
  codigosSIE: EtiquetadoCodigoSIE[];
  cajas: EtiquetadoCaja[];
};
