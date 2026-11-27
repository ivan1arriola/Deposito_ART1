/**
 * Funciones de formateo y generacion de etiquetas
 */

import type { Personal, Rango, Role } from "@/types/entities";
import { TALLA_KEYS, TALLA_LABELS } from "./tallas";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  DESARROLLADOR: "Desarrollador",
  EDITOR: "Editor",
  READ_ONLY: "Solo Lectura",
};

export const ROLE_DETAILS: Record<Role, { description: string; scope: string }> = {
  ADMIN: {
    description: "Gestiona usuarios, firmas, auditoría y toda la operación del sistema.",
    scope: "Acceso total de configuración y administración.",
  },
  DESARROLLADOR: {
    description:
      "Administra el sistema y además puede operar como cuenta técnica sin grado militar.",
    scope: "Acceso total técnico y administrativo.",
  },
  EDITOR: {
    description:
      "Opera personal, movimientos y catálogos operativos, sin administración de usuarios.",
    scope: "Acceso operativo sin privilegios de seguridad.",
  },
  READ_ONLY: {
    description:
      "Consulta datos e imprime documentos sin poder modificar registros ni configuraciones.",
    scope: "Acceso de visualización e impresión.",
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

export function rangoAbreviacionLabel(
  rango: { abreviacion?: string | null } | null | undefined,
  fallback = "Sin grado"
) {
  const value = rango?.abreviacion?.trim();
  return value ? value : fallback;
}

export function systemUserLabel(user: {
  rango?: { abreviacion?: string | null } | null;
  apellido?: string | null;
  nombre?: string | null;
  username?: string | null;
}) {
  const rango = user.rango?.abreviacion?.trim() ?? "";
  const apellido = user.apellido?.trim() ?? "";
  const nombre = user.nombre?.trim() ?? "";
  const name = [apellido, nombre].filter(Boolean).join(", ").trim();

  if (rango && name) {
    return `${rango} ${name}`.replace(/\s+/g, " ").trim();
  }

  return name || user.username?.trim() || "Usuario sin nombre";
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
