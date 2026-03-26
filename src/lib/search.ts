import { normalizeSearchText } from "@/lib/spanish-text";

/**
 * Utilidades para búsqueda y filtrado de texto
 */

/**
 * Normaliza un término de búsqueda eliminando acentos, puntuación y convirtiendo a minúsculas
 */
export function normalizeSearchTerm(value: string): string {
  return normalizeSearchText(value);
}
