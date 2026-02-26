/**
 * Utilidades para búsqueda y filtrado de texto
 */

/**
 * Normaliza un término de búsqueda eliminando acentos, puntuación y convirtiendo a minúsculas
 */
export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[."']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
