export type HojaMatrixRow = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  bateriaOrden: number | null;
  grado: string;
  gradoOrden: number;
  gradoAbreviacion: string;
  totales: number[];
  totalGeneral: number;
};
