/**
 * Funciones de mapeo entre entidades de dominio y formularios
 */

import type { Personal, Talla } from "@/types/entities";
import type { PersonalForm } from "@/types/forms";
import { TALLA_KEYS, type TallaKey, normalizeTallaValue } from "./tallas";

/**
 * Convierte un array de tallas a un objeto map
 */
export function tallasMap(tallas: Talla[]): Record<string, string> {
  const base: Record<string, string> = {
    PARKA: "-",
    CAMISACO: "-",
    PANTALON: "-",
    KEPI: "-",
    CALZADO: "-",
  };

  for (const talla of tallas) {
    base[talla.tallaTipo.nombre] = talla.tallaValor;
  }

  return base;
}

/**
 * Convierte una fecha ISO a formato de input date (YYYY-MM-DD)
 */
export function toDateInput(dateIso: string | null): string {
  if (!dateIso) return "";
  return dateIso.slice(0, 10);
}

/**
 * Retorna la fecha actual en formato de input date (YYYY-MM-DD)
 */
export function getTodayDateInput(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convierte un valor de talla del dominio a formato de formulario
 */
export function toFormTallaValue(key: TallaKey, value: string): string {
  if (value === "-") return "";
  return normalizeTallaValue(key, value) ?? "";
}

/**
 * Convierte un formulario de personal a payload para la API
 */
export function personalPayload(form: PersonalForm, includeCi: boolean) {
  const tallas = TALLA_KEYS.reduce(
    (acc, key) => {
      acc[key] = normalizeTallaValue(key, form[key]) ?? "";
      return acc;
    },
    {} as Record<TallaKey, string>,
  );

  return {
    ...(includeCi ? { ci: form.ci.trim() } : {}),
    apellido1: form.apellido1.trim(),
    apellido2: form.apellido2.trim(),
    nombre1: form.nombre1.trim(),
    nombre2: form.nombre2.trim(),
    telefonoContacto: form.telefonoContacto.trim(),
    fechaIngreso: form.fechaIngreso || undefined,
    rangoId: Number(form.rangoId),
    bateriaId: form.bateriaId ? Number(form.bateriaId) : undefined,
    tallas,
  };
}

/**
 * Convierte una entidad Personal a formato de formulario editable
 */
export function toEditablePersonal(persona: Personal): PersonalForm {
  const tallas = tallasMap(persona.tallas);
  return {
    ci: persona.ci,
    apellido1: persona.apellido1,
    apellido2: persona.apellido2 ?? "",
    nombre1: persona.nombre1,
    nombre2: persona.nombre2 ?? "",
    telefonoContacto: persona.telefonoContacto ?? "",
    fechaIngreso: toDateInput(persona.fechaIngreso),
    rangoId: String(persona.rangoId),
    bateriaId: persona.bateriaId ? String(persona.bateriaId) : "",
    PARKA: toFormTallaValue("PARKA", tallas.PARKA),
    CAMISACO: toFormTallaValue("CAMISACO", tallas.CAMISACO),
    PANTALON: toFormTallaValue("PANTALON", tallas.PANTALON),
    KEPI: toFormTallaValue("KEPI", tallas.KEPI),
    CALZADO: toFormTallaValue("CALZADO", tallas.CALZADO),
  };
}
