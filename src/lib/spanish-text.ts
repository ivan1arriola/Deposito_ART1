const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

/**
 * Elimina diacriticos para comparaciones y busquedas insensibles a acento.
 * No usar para texto de salida al usuario.
 */
export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_REGEX, "");
}

/**
 * Normaliza texto para filtros/busquedas.
 */
export function normalizeSearchText(value: string): string {
  return stripDiacritics(value).replace(/[."']/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Normaliza texto para salida (PDF/UI/API) preservando tildes y Ñ.
 */
export function normalizeOutputText(value: string | null | undefined): string {
  if (!value) return "";
  return value.normalize("NFC").replace(/\u00a0/g, " ");
}
