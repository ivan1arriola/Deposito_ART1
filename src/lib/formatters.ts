/**
 * Funciones de formateo y generacion de etiquetas
 */

import type { Personal, Rango, Role } from "@/types/entities";
import { TALLA_KEYS, TALLA_LABELS } from "./tallas";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  READ_ONLY: "Solo Lectura",
};

export const ROLE_DETAILS: Record<Role, { description: string; scope: string }> = {
  ADMIN: {
    description: "Gestiona usuarios, firmas, auditoria y toda la operacion del sistema.",
    scope: "Acceso total de configuracion y administracion.",
  },
  EDITOR: {
    description: "Opera personal, movimientos y catalogos operativos, sin administracion de usuarios.",
    scope: "Acceso operativo sin privilegios de seguridad.",
  },
  READ_ONLY: {
    description: "Consulta datos e imprime documentos sin poder modificar registros ni configuraciones.",
    scope: "Acceso de visualizacion e impresion.",
  },
};

export function apellidosLabel(persona: Personal): string {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

export function nombresLabel(persona: Personal): string {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

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

export function rangoLabel(rango: Rango): string {
  return `${rango.abreviacion} - ${rango.nombreCompleto}`;
}

export function tallasEntries(tallas: Record<string, string>) {
  return TALLA_KEYS.map((key) => {
    const rawValue = tallas[key];
    const value = rawValue && rawValue !== "-" ? rawValue : "Sin dato";
    return { key, label: TALLA_LABELS[key], value };
  });
}
