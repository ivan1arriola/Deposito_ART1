/**
 * Funciones de formateo y generación de etiquetas
 */

import type { Personal, Rango, Role } from "@/types/entities";
import { TALLA_KEYS, TALLA_LABELS } from "./tallas";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
};

export const ROLE_DETAILS: Record<Role, { description: string; scope: string }> = {
  ADMIN: {
    description: "Gestiona usuarios, firmas, auditoría y toda la operación del sistema.",
    scope: "Acceso total de configuración y administración.",
  },
  EDITOR: {
    description: "Opera personal, movimientos y catálogos operativos, sin administración de usuarios.",
    scope: "Acceso operativo sin privilegios de seguridad.",
  },
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

export function roleDescription(role: Role | null | undefined): string {
  if (!role) return "Sin permisos asignados.";
  return ROLE_DETAILS[role]?.description ?? role;
}

export function roleScope(role: Role | null | undefined): string {
  if (!role) return "";
  return ROLE_DETAILS[role]?.scope ?? "";
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
