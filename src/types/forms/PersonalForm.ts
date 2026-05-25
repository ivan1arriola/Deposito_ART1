export type PersonalForm = {
  ci: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  telefonoContacto: string;
  esReingreso: boolean;
  fechaIngreso: string;
  fechaIngresoOriginal: string;
  rangoId: string;
  bateriaId: string;
  PARKA: string;
  CAMISACO: string;
  PANTALON: string;
  KEPI: string;
  CALZADO: string;
};

export const EMPTY_PERSONAL_FORM: PersonalForm = {
  ci: "",
  apellido1: "",
  apellido2: "",
  nombre1: "",
  nombre2: "",
  telefonoContacto: "",
  esReingreso: false,
  fechaIngreso: "",
  fechaIngresoOriginal: "",
  rangoId: "",
  bateriaId: "",
  PARKA: "",
  CAMISACO: "",
  PANTALON: "",
  KEPI: "",
  CALZADO: "",
};
