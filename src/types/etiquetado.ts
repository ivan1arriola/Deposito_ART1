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
  codigoSIEId: string;
  codigo: string;
  talla: string;
  itemId: string;
  itemNombre: string;
};

export type EtiquetadoCajaCodigoSIE = {
  codigoSIEId: string;
  codigo: string;
  talla: string;
};

export type EtiquetadoCajaEquipo = {
  itemId: string;
  itemNombre: string;
  cantidad: number;
  codigosSIE: EtiquetadoCajaCodigoSIE[];
  sinCodigo: boolean;
};

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

export type EtiquetadoDashboardData = {
  generatedAt: string;
  items: EtiquetadoItem[];
  estanterias: EtiquetadoEstanteria[];
  codigosSIE: EtiquetadoCodigoSIE[];
  cajas: EtiquetadoCaja[];
};
