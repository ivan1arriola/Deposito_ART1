import type { TipoPersonal } from "@/generated/prisma/client";

type PersonalDestinatarioShape = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  rango: {
    abreviacion: string;
    nombreCompleto?: string | null;
    tipo?: TipoPersonal;
    orden?: number | null;
  };
  bateria?: {
    nombre: string;
    orden?: number | null;
  } | null;
};

type PersonaExternaShape = {
  ci: string;
  grado: string;
  nombre: string;
  apellido: string;
  unidadDestino: string;
};

type RecintoDestinatarioShape = {
  clase: string;
  nombre: string;
};

type DestinatarioSource = {
  destinatarioPersonal?: { personal: PersonalDestinatarioShape } | null;
  destinatarioExterno?: { personaExterna: PersonaExternaShape } | null;
  destinatarioRecinto?: RecintoDestinatarioShape | null;
};

export type DestinatarioMovimientoResumen = {
  clase: "INTERNO" | "EXTERNO";
  tipo: "PERSONAL" | "OFICIAL" | "SUBOFICIAL" | "EXTERNO" | "RECINTO";
  ci: string;
  perfilCi: string | null;
  nombre: string;
  etiqueta: string;
  grado: string;
  gradoAbreviacion: string | null;
  gradoOrden: number | null;
  unidadDestino: string | null;
  bateria: string | null;
};

function joinNames(...values: Array<string | null | undefined>) {
  return values
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapDestinatarioTipoFromPersonal(tipo: TipoPersonal) {
  if (tipo === "SUBALTERNO") return "PERSONAL" as const;
  if (tipo === "OFICIAL") return "OFICIAL" as const;
  return "SUBOFICIAL" as const;
}

export function buildPersonalDestinatarioNombre(personal: PersonalDestinatarioShape) {
  const apellidos = joinNames(personal.apellido1, personal.apellido2);
  const nombres = joinNames(personal.nombre1, personal.nombre2);
  return joinNames(apellidos ? `${apellidos},` : "", nombres);
}

export function buildPersonalDestinatarioEtiqueta(personal: PersonalDestinatarioShape) {
  return joinNames(personal.rango.abreviacion, buildPersonalDestinatarioNombre(personal));
}

export function buildPersonaExternaNombre(personaExterna: PersonaExternaShape) {
  return joinNames(personaExterna.apellido ? `${personaExterna.apellido},` : "", personaExterna.nombre);
}

export function buildPersonaExternaEtiqueta(personaExterna: PersonaExternaShape) {
  return joinNames(personaExterna.grado, buildPersonaExternaNombre(personaExterna));
}

export function normalizeRecintoClase(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "EXTERNO") return "EXTERNO" as const;
  return "INTERNO" as const;
}

export function buildRecintoDestinatarioEtiqueta(recinto: RecintoDestinatarioShape) {
  return joinNames(recinto.nombre);
}

export function resolveDestinatarioMovimiento(source: DestinatarioSource): DestinatarioMovimientoResumen | null {
  if (source.destinatarioPersonal?.personal) {
    const personal = source.destinatarioPersonal.personal;
    return {
      clase: "INTERNO",
      tipo: personal.rango.tipo ? mapDestinatarioTipoFromPersonal(personal.rango.tipo) : "PERSONAL",
      ci: personal.ci,
      perfilCi: personal.ci,
      nombre: buildPersonalDestinatarioNombre(personal),
      etiqueta: buildPersonalDestinatarioEtiqueta(personal),
      grado: personal.rango.nombreCompleto?.trim() || personal.rango.abreviacion,
      gradoAbreviacion: personal.rango.abreviacion,
      gradoOrden: personal.rango.orden ?? null,
      unidadDestino: null,
      bateria: personal.bateria?.nombre ?? null,
    };
  }

  if (source.destinatarioExterno?.personaExterna) {
    const personaExterna = source.destinatarioExterno.personaExterna;
    return {
      clase: "EXTERNO",
      tipo: "EXTERNO",
      ci: personaExterna.ci,
      perfilCi: null,
      nombre: buildPersonaExternaNombre(personaExterna),
      etiqueta: buildPersonaExternaEtiqueta(personaExterna),
      grado: personaExterna.grado,
      gradoAbreviacion: null,
      gradoOrden: null,
      unidadDestino: personaExterna.unidadDestino,
      bateria: null,
    };
  }

  if (source.destinatarioRecinto) {
    const recinto = source.destinatarioRecinto;
    const clase = normalizeRecintoClase(recinto.clase);
    const etiqueta = buildRecintoDestinatarioEtiqueta(recinto);
    return {
      clase,
      tipo: "RECINTO",
      ci: "",
      perfilCi: null,
      nombre: etiqueta,
      etiqueta,
      grado: clase === "EXTERNO" ? "Recinto externo" : "Recinto interno",
      gradoAbreviacion: "RECINTO",
      gradoOrden: null,
      unidadDestino: clase === "EXTERNO" ? "Fuera de la unidad" : "Dentro de la unidad",
      bateria: null,
    };
  }

  return null;
}
