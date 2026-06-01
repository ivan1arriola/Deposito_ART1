import { TALLA_KEYS, TALLA_LABELS, TALLA_OPTIONS, type TallaKey, normalizeTallaValue } from "@/lib/tallas";
import { formatDateOnlyForDisplay, getTodayDateInput as getTodayDateInputHelper } from "@/lib/date-helpers";
import { normalizeSearchText } from "@/lib/spanish-text";
import type { Personal, Role, Rango, Talla } from "@/types/entities";
import type { PersonalForm } from "@/types/forms";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  DESARROLLADOR: "Desarrollador",
  EDITOR: "Editor",
  READ_ONLY: "Solo Lectura",
};

/**
 * Convierte un array de Talla en un objeto con claves de tipo de prenda
 */
export function tallasMap(tallas: Talla[]) {
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
 * Obtiene los apellidos de una persona formateados
 */
export function apellidosLabel(persona: Personal) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Obtiene los nombres de una persona formateados
 */
export function nombresLabel(persona: Personal) {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Normaliza un término de búsqueda removiendo acentos y caracteres especiales
 */
export function normalizeSearchTerm(value: string) {
  return normalizeSearchText(value);
}

/**
 * Obtiene un array de entradas de tallas normalizadas
 */
export function tallasEntries(tallas: Record<string, string>) {
  return TALLA_KEYS.map((key) => {
    const rawValue = tallas[key];
    const value = rawValue && rawValue !== "-" ? rawValue : "Sin dato";
    return { key, label: TALLA_LABELS[key], value };
  });
}

/**
 * Reordena un array moviendo un elemento de una posición a otra
 */
export function moveIdInOrder(order: string[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return order;
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Obtiene la etiqueta de un rol
 */
export function roleLabel(role: Role | null | undefined) {
  if (!role) return "Sin rol";
  return ROLE_LABELS[role] ?? role;
}

/**
 * Obtiene la etiqueta de un grado/rango
 */
export function rangoLabel(rango: Rango) {
  return `${rango.abreviacion} - ${rango.nombreCompleto}`;
}

/**
 * Convierte una fecha del dominio a formato input (DD/MM/AAAA)
 */
export function toDateInput(dateIso: string | null) {
  return formatDateOnlyForDisplay(dateIso);
}

/**
 * Obtiene la fecha de hoy en formato input (DD/MM/AAAA)
 */
export function getTodayDateInput() {
  return getTodayDateInputHelper();
}

/**
 * Convierte un valor de talla para usar en formulario
 */
export function toFormTallaValue(key: TallaKey, value: string) {
  if (value === "-") return "";
  return normalizeTallaValue(key, value) ?? "";
}

/**
 * Compara dos valores de talla según su tipo
 */
export function compareTallaOptions(key: TallaKey, a: string, b: string) {
  if (key === "PARKA" || key === "CAMISACO" || key === "PANTALON") {
    const order = TALLA_OPTIONS[key];
    const aIdx = order.indexOf(a);
    const bIdx = order.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
  }

  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNum = Number.isFinite(aNum);
  const bIsNum = Number.isFinite(bNum);
  if (aIsNum && bIsNum) return aNum - bNum;
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
}

/**
 * Convierte un formulario de personal a payload para API
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
    esReingreso: form.esReingreso,
    fechaIngreso: form.fechaIngreso || undefined,
    fechaIngresoOriginal: form.esReingreso ? form.fechaIngresoOriginal || undefined : undefined,
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

/**
 * Realiza una llamada a la API con manejo de errores
 */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const isReadRequest = method === "GET" || method === "HEAD";
  const headers = new Headers(init?.headers ?? undefined);

  if (isReadRequest) {
    if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-cache");
    if (!headers.has("Pragma")) headers.set("Pragma", "no-cache");
  }

  const response = await fetch(url, {
    ...init,
    ...(isReadRequest ? { cache: init?.cache ?? "no-store" } : {}),
    headers,
  });
  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Error en la operacion.";
    throw new Error(message || "Error en la operacion.");
  }

  if (data === null) {
    throw new Error("El servidor no devolvió datos. No se pudo completar la lectura.");
  }

  return data as T;
}

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

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
