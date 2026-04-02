import "server-only";

import { stripDiacritics } from "@/lib/spanish-text";

const URUGUAY_TIMEZONE = "America/Montevideo";

function sanitizeSegment(value: string): string {
  const normalized = stripDiacritics(String(value ?? ""));
  const compact = normalized.replace(/\s+/g, " ").trim();
  const slug = compact.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug === "" ? "SIN-DATO" : slug;
}

export function getUruguayDateStamp(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: URUGUAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}${month}${day}`;
}

export function buildSingleHojaEntregaFileName(input: {
  ci: string;
  grado: string;
  apellido: string;
  nombre: string;
  date?: Date;
}): string {
  const stamp = getUruguayDateStamp(input.date);
  const ci = sanitizeSegment(input.ci);
  const grado = sanitizeSegment(input.grado);
  const apellido = sanitizeSegment(input.apellido);
  const nombre = sanitizeSegment(input.nombre);

  return `${stamp}-${ci}-${grado}-${apellido}-${nombre}-hoja-entrega.pdf`;
}

export function buildUnidadHojasEntregaFileName(date: Date = new Date()): string {
  const stamp = getUruguayDateStamp(date);
  return `${stamp}-hoja-entrega-unidad.pdf`;
}
