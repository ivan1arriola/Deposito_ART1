/**
 * Utilidades de renderizado y etiquetas para operaciones de auditoría
 */

import type { AuditoriaRecord } from "@/types/entities";

export function auditActionLabel(accion: string): string {
  const labels: Record<string, string> = {
    CREATE: "Creo",
    UPDATE: "Actualizo",
    DELETE: "Elimino",
    LOGIN: "Inicio sesión",
    LOGOUT: "Cerró sesión",
  };
  return labels[accion] || accion;
}

export function auditEntityLabel(entidad: string): string {
  const labels: Record<string, string> = {
    AUTH: "autenticación",
    REGISTRO: "movimiento",
    PERSONAL: "personal",
    USUARIO: "usuario",
    RANGO: "grado",
    BATERIA: "bateria",
    ITEM: "item",
    FIRMAS_CONFIG: "firmas institucionales",
  };
  return labels[entidad] || entidad.toLowerCase();
}

export function renderAuditDetalle(detalle: unknown): string {
  if (!detalle || typeof detalle !== "object" || Array.isArray(detalle)) return "";
  
  const info = detalle as Record<string, unknown>;
  
  // Manejar items en detalle
  const items = Array.isArray(info.items)
    ? info.items
        .filter((item) => item && typeof item === "object" && !Array.isArray(item))
        .map((item) => {
          const it = item as Record<string, unknown>;
          return `${it.nombre} (${it.cantidad}x)`;
        })
    : [];

  if (items.length > 0) {
    return items.join(", ");
  }

  // Para otros detalles, retornar representación string básica
  const keys = Object.keys(info).filter(
    (k) => typeof info[k] === "string" || typeof info[k] === "number"
  );
  
  if (keys.length === 0) return "";
  
  return keys
    .map((key) => `${key}: ${info[key]}`)
    .join(", ")
    .substring(0, 100);
}

export function renderAuditDetalleItems(detalle: unknown): string[] | null {
  if (!detalle || typeof detalle !== "object" || Array.isArray(detalle)) return null;
  
  const info = detalle as Record<string, unknown>;
  
  if (!Array.isArray(info.items)) return null;
  
  return info.items
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const it = item as Record<string, unknown>;
      return `${it.nombre}: ${it.cantidad}`;
    });
}
