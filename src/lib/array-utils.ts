/**
 * Utilidades para manipulación de arrays
 */

import { TALLA_OPTIONS, type TallaKey } from "./tallas";

/**
 * Mueve un elemento de una posición a otra en un array de IDs
 */
export function moveIdInOrder(order: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex === toIndex) return order;
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * Compara dos opciones de talla para ordenamiento
 */
export function compareTallaOptions(key: TallaKey, a: string, b: string): number {
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
