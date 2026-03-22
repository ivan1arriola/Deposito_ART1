export type EtiquetadoItem = {
  itemId: string;
  nombre: string;
  activo: boolean;
};

export type EtiquetadoEstanteria = {
  codigo: string;
  piso: number;
  etiqueta: string;
};

export type EtiquetadoCodigoSIE = {
  codigo: string;
  talla: string | null;
  itemId: string;
  itemNombre: string;
};

export type EtiquetadoCajaCodigoSIE = {
  codigo: string;
  talla: string | null;
};

export type EtiquetadoCaja = {
  codigoDepositoGeneral: number;
  estanteria: string;
  cantidad: number;
  itemNombres: string[];
  codigosSIE: EtiquetadoCajaCodigoSIE[];
  tallas: string[];
};

export type EtiquetadoDashboardData = {
  generatedAt: string;
  items: EtiquetadoItem[];
  estanterias: EtiquetadoEstanteria[];
  codigosSIE: EtiquetadoCodigoSIE[];
  cajas: EtiquetadoCaja[];
};
