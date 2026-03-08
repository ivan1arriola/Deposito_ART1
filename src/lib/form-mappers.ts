/**
 * Funciones de mapeo entre entidades de dominio y formularios
 */

import type { Personal, Talla } from "@/types/entities";
import type { OficialSuboficialForm, PersonalForm } from "@/types/forms";
import { formatDateOnlyForDisplay } from "./date-helpers";
import { TALLA_KEYS, type TallaKey, normalizeTallaValue } from "./tallas";

export { getTodayDateInput } from "./date-helpers";

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
 * Convierte una fecha del dominio a formato de input DD/MM/AAAA
 */
export function toDateInput(dateIso: string | null): string {
  return formatDateOnlyForDisplay(dateIso);
}

/**
 * Convierte un valor de talla del dominio a formato de formulario
 */
export function toFormTallaValue(key: TallaKey, value: string): string {
  if (value === "-") return "";
  return normalizeTallaValue(key, value) ?? "";
}

type TallasFormValues = Record<TallaKey, string>;

function tallasPayloadFromForm(form: TallasFormValues) {
  return TALLA_KEYS.reduce(
    (acc, key) => {
      acc[key] = normalizeTallaValue(key, form[key]) ?? "";
      return acc;
    },
    {} as Record<TallaKey, string>,
  );
}

/**
 * Convierte un formulario de personal a payload para la API
 */
export function personalPayload(form: PersonalForm, includeCi: boolean) {
  const tallas = tallasPayloadFromForm(form);

  return {
    ...(includeCi ? { ci: form.ci.trim() } : {}),
    apellido1: form.apellido1.trim(),
    apellido2: form.apellido2.trim(),
    nombre1: form.nombre1.trim(),
    nombre2: form.nombre2.trim(),
    telefonoContacto: form.telefonoContacto.trim(),
    esReingreso: form.esReingreso,
    fechaIngreso: form.fechaIngreso || undefined,
    fechaIngresoOriginal: form.esReingreso ? form.fechaIngresoOriginal || undefined : undefined,
    rangoId: Number(form.rangoId),
    bateriaId: form.bateriaId ? Number(form.bateriaId) : undefined,
    tallas,
  };
}

export function oficialSuboficialPayload(form: OficialSuboficialForm, includeCi: boolean) {
  const tallas = tallasPayloadFromForm(form);

  return {
    ...(includeCi ? { ci: form.ci.trim() } : {}),
    tipo: form.tipo,
    apellido1: form.apellido1.trim(),
    apellido2: form.apellido2.trim(),
    nombre1: form.nombre1.trim(),
    nombre2: form.nombre2.trim(),
    telefonoContacto: form.telefonoContacto.trim(),
    rangoId: Number(form.rangoId),
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
    esReingreso: persona.esReingreso,
    fechaIngreso: toDateInput(persona.fechaIngreso),
    fechaIngresoOriginal: toDateInput(persona.fechaIngresoOriginal),
    rangoId: String(persona.rangoId),
    bateriaId: persona.bateriaId ? String(persona.bateriaId) : "",
    PARKA: toFormTallaValue("PARKA", tallas.PARKA),
    CAMISACO: toFormTallaValue("CAMISACO", tallas.CAMISACO),
    PANTALON: toFormTallaValue("PANTALON", tallas.PANTALON),
    KEPI: toFormTallaValue("KEPI", tallas.KEPI),
    CALZADO: toFormTallaValue("CALZADO", tallas.CALZADO),
  };
}
