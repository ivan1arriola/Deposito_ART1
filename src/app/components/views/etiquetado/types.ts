import type { EtiquetadoDashboardData } from "@/types/etiquetado";

export type EtiquetadoSection =
  | "codigos_sie"
  | "listado_cajas"
  | "imprimir_todas";

export type EtiquetaOrientacion = "horizontal" | "vertical";

export type CreateCodigoSIEInput = {
  codigo: string;
  talla: string;
  equipoId: string;
  allowDuplicateCodigo?: boolean;
};

export type UpdateCodigoSIEInput = {
  originalCodigoSIEId: string;
  originalCodigo: string;
  codigo: string;
  talla: string;
  equipoId: string;
};

export type CreateItemInput = {
  nombre: string;
};

export type CreateCajaInput = {
  estanteria: string;
  piso: number;
  equipos: Array<{
    equipoId: string;
    cantidad: number;
  }>;
  codigosSIEIds: string[];
};

export type EtiquetadoViewProps = {
  section: EtiquetadoSection;
  data: EtiquetadoDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  onReload: () => void;
  onCreateItem: (input: CreateItemInput) => void;
  onCreateEstanteria: (codigo: string, piso: number) => void;
  onDeleteEstanteria: (codigo: string, piso: number) => void;
  onCreateCodigoSIE: (input: CreateCodigoSIEInput) => void;
  onUpdateCodigoSIE: (input: UpdateCodigoSIEInput) => void;
  onDeleteCodigoSIE: (codigoSIEId: string, codigo: string) => void;
  onCreateCaja: (input: CreateCajaInput) => void;
  onDeleteCaja: (codigoDepositoGeneral: number) => void;
  onPrintCaja: (codigoDepositoGeneral: number, orientacion: EtiquetaOrientacion) => void;
  onPrintListadoCajas: () => void;
  onPrintTodas: (cajas: Array<{ codigoDepositoGeneral: number; orientacion: EtiquetaOrientacion }>) => void;
};
