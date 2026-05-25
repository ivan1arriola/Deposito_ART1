import type { TipoOficialSuboficial } from "../entities/TipoOficialSuboficial";

export type OficialSuboficialForm = {
  ci: string;
  tipo: TipoOficialSuboficial;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  telefonoContacto: string;
  rangoId: string;
  PARKA: string;
  CAMISACO: string;
  PANTALON: string;
  KEPI: string;
  CALZADO: string;
};

export const EMPTY_OFICIAL_SUBOFICIAL_FORM: OficialSuboficialForm = {
  ci: "",
  tipo: "OFICIAL",
  apellido1: "",
  apellido2: "",
  nombre1: "",
  nombre2: "",
  telefonoContacto: "",
  rangoId: "",
  PARKA: "",
  CAMISACO: "",
  PANTALON: "",
  KEPI: "",
  CALZADO: "",
};
