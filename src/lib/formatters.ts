/**
 * Funciones de formateo y generación de etiquetas
 */

import type { Personal, Rango, Role } from "@/types/entities";
import { TALLA_KEYS, TALLA_LABELS } from "./tallas";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Lector",
};

/**
 * Formatea los apellidos de una persona
 */
export function apellidosLabel(persona: Personal): string {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Formatea los nombres de una persona
 */
export function nombresLabel(persona: Personal): string {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Retorna la etiqueta de un rol de usuario
 */
export function roleLabel(role: Role | null | undefined): string {
  if (!role) return "Sin rol";
  return ROLE_LABELS[role] ?? role;
}

/**
 * Retorna la etiqueta de un rango militar
 */
export function rangoLabel(rango: Rango): string {
  return `${rango.abreviacion} - ${rango.nombreCompleto}`;
}

/**
 * Convierte un map de tallas a un array de entradas con etiquetas
 */
export function tallasEntries(tallas: Record<string, string>) {
  return TALLA_KEYS.map((key) => {
    const rawValue = tallas[key];
    const value = rawValue && rawValue !== "-" ? rawValue : "Sin dato";
    return { key, label: TALLA_LABELS[key], value };
  });
}
