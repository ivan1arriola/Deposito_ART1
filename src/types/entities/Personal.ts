import type { Bateria } from "./Bateria";
import type { Rango } from "./Rango";
import type { Talla } from "./Talla";

export type Personal = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  esReingreso: boolean;
  fechaIngreso: string | null;
  fechaIngresoOriginal: string | null;
  rangoId: number;
  bateriaId: number | null;
  rango: Rango;
  bateria: Bateria | null;
  tallas: Talla[];
};
