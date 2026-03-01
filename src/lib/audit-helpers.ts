/**
 * Utilidades de renderizado y etiquetas para operaciones de auditoria
 */

import { createElement, type ReactNode } from "react";
import { formatUruguayanCi, normalizeCi } from "@/lib/ci";

type AuditDetailObject = Record<string, unknown>;
export type AuditCiReferences = Record<string, string>;

function isObject(value: unknown): value is AuditDetailObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function formatDate(value: unknown) {
  const text = asText(value);
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString("es-UY");
}

function buildLine(key: string, label: string, value: string) {
  return createElement(
    "p",
    { key, className: "text-xs text-stone-700" },
    createElement("span", { className: "font-semibold text-stone-900" }, `${label}: `),
    value,
  );
}

function resolveCiOwner(ci: string, ciReferences?: AuditCiReferences) {
  return ciReferences?.[normalizeCi(ci)]?.trim() || "";
}

export function formatAuditCi(ci: string, ciReferences?: AuditCiReferences) {
  const owner = resolveCiOwner(ci, ciReferences);
  const normalized = normalizeCi(ci);
  const formattedCi = normalized.length >= 7 && normalized.length <= 8 ? formatUruguayanCi(ci) : ci.trim();
  return owner ? `${formattedCi} - ${owner}` : formattedCi;
}

function extractEquipos(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  return value
    .filter((item) => isObject(item))
    .map((item) => {
      const nombre = asText(item.nombre) || "Equipo sin nombre";
      const cantidad = asText(item.cantidad) || "0";
      return `${nombre} (${cantidad}x)`;
    });
}

function renderMovimientoDetalle(info: AuditDetailObject, ciReferences?: AuditCiReferences): ReactNode {
  const lines: ReactNode[] = [];
  const personal = isObject(info.personal) ? info.personal : null;

  if (personal) {
    const nombre = asText(personal.nombre);
    const grado = asText(personal.grado);
    const bateria = asText(personal.bateria);
    const ci = asText(personal.ci);
    const personalParts = [grado, nombre, ci ? `CI ${formatAuditCi(ci, ciReferences)}` : "", bateria ? `Bateria ${bateria}` : ""].filter(
      Boolean,
    );
    if (personalParts.length > 0) {
      lines.push(buildLine("personal", "Personal", personalParts.join(" - ")));
    }
  } else if (asText(info.ci)) {
    lines.push(buildLine("ci", "CI", formatAuditCi(asText(info.ci), ciReferences)));
  }

  const tipoAnterior = asText(info.tipoAnterior);
  const tipoNuevo = asText(info.tipoNuevo);
  const tipo = asText(info.tipo);
  if (tipoAnterior || tipoNuevo) {
    lines.push(buildLine("tipo-cambio", "Tipo", `${tipoAnterior || "Sin dato"} -> ${tipoNuevo || "Sin dato"}`));
  } else if (tipo) {
    lines.push(buildLine("tipo", "Tipo", tipo));
  }

  const fechaAnterior = formatDate(info.fechaAnterior);
  const fechaNueva = formatDate(info.fechaNueva);
  const fechaMovimiento = formatDate(info.fechaMovimiento);
  if (fechaAnterior || fechaNueva) {
    lines.push(buildLine("fecha-cambio", "Fecha", `${fechaAnterior || "Sin dato"} -> ${fechaNueva || "Sin dato"}`));
  } else if (fechaMovimiento) {
    lines.push(buildLine("fecha", "Fecha", fechaMovimiento));
  }

  const comentariosAnterior = asText(info.comentariosAnterior);
  const comentariosNuevo = asText(info.comentariosNuevo);
  const comentarios = asText(info.comentarios);
  if (comentariosAnterior || comentariosNuevo) {
    lines.push(
      buildLine(
        "comentarios-cambio",
        "Comentarios",
        `${comentariosAnterior || "Sin comentario"} -> ${comentariosNuevo || "Sin comentario"}`,
      ),
    );
  } else if (comentarios) {
    lines.push(buildLine("comentarios", "Comentarios", comentarios));
  }

  const items = extractEquipos(info.items);
  const itemsAnteriores = extractEquipos(info.itemsAnteriores);
  const itemsNuevos = extractEquipos(info.itemsNuevos);
  if (items.length > 0) {
    lines.push(buildLine("items", "Equipos", items.join(", ")));
  }
  if (itemsAnteriores.length > 0) {
    lines.push(buildLine("items-anteriores", "Equipos anteriores", itemsAnteriores.join(", ")));
  }
  if (itemsNuevos.length > 0) {
    lines.push(buildLine("items-nuevos", "Equipos nuevos", itemsNuevos.join(", ")));
  }

  const totalUnidades = asText(info.totalUnidades);
  const totalUnidadesAnterior = asText(info.totalUnidadesAnterior);
  const totalUnidadesNuevo = asText(info.totalUnidadesNuevo);
  if (totalUnidadesAnterior || totalUnidadesNuevo) {
    lines.push(
      buildLine(
        "unidades-cambio",
        "Total unidades",
        `${totalUnidadesAnterior || "0"} -> ${totalUnidadesNuevo || "0"}`,
      ),
    );
  } else if (totalUnidades) {
    lines.push(buildLine("unidades", "Total unidades", totalUnidades));
  }

  const ip = asText(info.ip);
  if (ip) {
    lines.push(buildLine("ip", "IP", ip));
  }

  if (lines.length === 0) return "";

  return createElement("div", { className: "mt-2 space-y-1" }, ...lines);
}

export function auditActionLabel(accion: string): string {
  const labels: Record<string, string> = {
    CREATE: "Creo",
    UPDATE: "Actualizo",
    DELETE: "Elimino",
    LOGIN: "Inicio sesion",
    LOGOUT: "Cerro sesion",
  };
  return labels[accion] || accion;
}

export function auditEntityLabel(entidad: string): string {
  const labels: Record<string, string> = {
    AUTH: "autenticacion",
    REGISTRO: "movimiento",
    PERSONAL: "personal",
    USUARIO: "usuario",
    RANGO: "grado",
    BATERIA: "bateria",
    ITEM: "item",
    FIRMAS_CONFIG: "firmas institucionales",
    OBSERVACION: "observacion",
  };
  return labels[entidad] || entidad.toLowerCase();
}

export function formatAuditEntityId(entidadId: string | null, ciReferences?: AuditCiReferences) {
  if (!entidadId) return "Entidad sin ID";
  return `Entidad ID: ${formatAuditCi(entidadId, ciReferences)}`;
}

export function renderAuditDetalle(detalle: unknown, ciReferences?: AuditCiReferences): ReactNode {
  if (!isObject(detalle)) return "";

  const evento = asText(detalle.evento);
  if (evento.startsWith("MOVIMIENTO_")) {
    return renderMovimientoDetalle(detalle, ciReferences);
  }

  const keys = Object.keys(detalle).filter((key) => {
    const value = detalle[key];
    return typeof value === "string" || typeof value === "number";
  });

  if (keys.length === 0) return "";

  return createElement(
    "div",
    { className: "mt-2 space-y-1" },
    ...keys.map((key) =>
      buildLine(
        key,
        key.toLowerCase() === "ci" ? "CI" : key,
        key.toLowerCase() === "ci" ? formatAuditCi(asText(detalle[key]), ciReferences) : asText(detalle[key]),
      ),
    ),
  );
}

export function renderAuditDetalleEquipos(detalle: unknown): string[] | null {
  if (!isObject(detalle)) return null;

  const items = extractEquipos(detalle.items);
  return items.length > 0 ? items : null;
}
