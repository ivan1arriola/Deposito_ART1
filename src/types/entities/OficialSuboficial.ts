import type { GradoMando } from "./GradoMando";
import type { Talla } from "./Talla";
import type { TipoOficialSuboficial } from "./TipoOficialSuboficial";

export type OficialSuboficial = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  rangoId: number;
  nombre: string;
  apellido: string;
  tipo: TipoOficialSuboficial;
  gradoMandoId: number;
  gradoMando: GradoMando;
  tallas: Talla[];
};
