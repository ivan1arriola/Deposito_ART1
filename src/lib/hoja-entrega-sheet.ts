import { extractDateParts, formatDateOnlyForDisplay } from "@/lib/date-helpers";

export type HojaEntregaMatrixRow = {
  item: string;
  entrega: number[];
  entregaTotal: number;
  devolucion: number[];
  devolucionTotal: number;
};

export type HojaEntregaSheetData = {
  persona: {
    ci: string;
    apellido1: string;
    apellido2: string | null;
    nombre1: string;
    nombre2: string | null;
    esReingreso: boolean;
    fechaIngreso: string | null;
    fechaIngresoOriginal: string | null;
    rango: string;
    rangoAbreviacion: string;
    bateria: string | null;
    tallas: {
      PARKA: string;
      CAMISACO: string;
      PANTALON: string;
      KEPI: string;
      CALZADO: string;
    };
  };
  entregas: Array<{ fecha: string | null }>;
  devoluciones: Array<{ fecha: string | null }>;
  matrix: HojaEntregaMatrixRow[];
  firmas: {
    encargadoTexto: string;
    encargadoRango: string;
    encargadoNombre: string;
    oficialTexto: string;
    oficialRango: string;
    oficialNombre: string;
  };
  observaciones: Array<{ fecha: string; texto: string }>;
};

export function getHojaEntregaDatePart(value: string | null | undefined, part: "day" | "month" | "year"): string {
  const parts = extractDateParts(value);
  if (!parts) return "";
  return parts[part];
}

export function formatHojaEntregaDisplayDate(value: string | Date | null | undefined) {
  return formatDateOnlyForDisplay(value, "-");
}
