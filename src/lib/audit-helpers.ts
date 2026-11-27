/**
 * Utilidades de renderizado y etiquetas para operaciones de auditoria
 */

import { createElement, type ReactNode } from "react";
import { formatUruguayanCi, normalizeCi } from "@/lib/ci";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";

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
  return formatDateOnlyForDisplay(text);
}

function buildLine(key: string, label: string, value: string) {
  return createElement(
    "p",
    { key, className: "text-xs text-stone-700" },
    createElement("span", { className: "font-semibold text-stone-900" }, `${label}: `),
    value
  );
}

function resolveCiOwner(ci: string, ciReferences?: AuditCiReferences) {
  return ciReferences?.[normalizeCi(ci)]?.trim() || "";
}

export function formatAuditCi(ci: string, ciReferences?: AuditCiReferences) {
  const owner = resolveCiOwner(ci, ciReferences);
  const normalized = normalizeCi(ci);
  const formattedCi =
    normalized.length >= 7 && normalized.length <= 8 ? formatUruguayanCi(ci) : ci.trim();
  return owner ? `${formattedCi} - ${owner}` : formattedCi;
}

function extractNamedQuantities(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];

  return value
    .filter((equipo) => isObject(equipo))
    .map((equipo) => {
      const nombre = asText(equipo.nombre) || "Elemento sin nombre";
      const cantidad = asText(equipo.cantidad) || "0";
      return `${nombre} (${cantidad}x)`;
    });
}

function extractEquipos(value: unknown) {
  return extractNamedQuantities(value);
}

function extractArticulos(value: unknown) {
  return extractNamedQuantities(value);
}

function renderMovimientoDetalle(
  info: AuditDetailObject,
  ciReferences?: AuditCiReferences
): ReactNode {
  const lines: ReactNode[] = [];
  const personal = isObject(info.personal) ? info.personal : null;
  const ordenante = isObject(info.ordenante) ? info.ordenante : null;

  if (personal) {
    const nombre = asText(personal.nombre);
    const grado = asText(personal.grado);
    const bateria = asText(personal.bateria);
    const ci = asText(personal.ci);
    const personalParts = [
      grado,
      nombre,
      ci ? `CI ${formatAuditCi(ci, ciReferences)}` : "",
      bateria ? `Batería ${bateria}` : "",
    ].filter(Boolean);
    if (personalParts.length > 0) {
      lines.push(buildLine("personal", "Personal", personalParts.join(" - ")));
    }
  } else if (asText(info.ci)) {
    lines.push(buildLine("ci", "CI", formatAuditCi(asText(info.ci), ciReferences)));
  }

  if (ordenante) {
    const nombre = asText(ordenante.nombre);
    const grado = asText(ordenante.grado);
    const ci = asText(ordenante.ci);
    const ordenanteParts = [
      grado,
      nombre,
      ci ? `CI ${formatAuditCi(ci, ciReferences)}` : "",
    ].filter(Boolean);
    if (ordenanteParts.length > 0) {
      lines.push(buildLine("ordenante", "Ordenó", ordenanteParts.join(" - ")));
    }
  }

  const usuarioEntrega = asText(info.usuarioEntrega);
  if (usuarioEntrega) {
    lines.push(buildLine("usuario-entrega", "Entregó", usuarioEntrega));
  }

  const tipoAnterior = asText(info.tipoAnterior);
  const tipoNuevo = asText(info.tipoNuevo);
  const tipo = asText(info.tipo);
  if (tipoAnterior || tipoNuevo) {
    lines.push(
      buildLine(
        "tipo-cambio",
        "Tipo",
        `${tipoAnterior || "Sin dato"} -> ${tipoNuevo || "Sin dato"}`
      )
    );
  } else if (tipo) {
    lines.push(buildLine("tipo", "Tipo", tipo));
  }

  const fechaAnterior = formatDate(info.fechaAnterior);
  const fechaNueva = formatDate(info.fechaNueva);
  const fechaMovimiento = formatDate(info.fechaMovimiento);
  if (fechaAnterior || fechaNueva) {
    lines.push(
      buildLine(
        "fecha-cambio",
        "Fecha",
        `${fechaAnterior || "Sin dato"} -> ${fechaNueva || "Sin dato"}`
      )
    );
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
        `${comentariosAnterior || "Sin comentario"} -> ${comentariosNuevo || "Sin comentario"}`
      )
    );
  } else if (comentarios) {
    lines.push(buildLine("comentarios", "Comentarios", comentarios));
  }

  const equipos = extractEquipos(info.equipos);
  const articulos = extractArticulos(info.articulos);
  const itemsAnteriores = extractEquipos(info.itemsAnteriores);
  const itemsNuevos = extractEquipos(info.itemsNuevos);
  if (articulos.length > 0) {
    lines.push(buildLine("articulos", "Artículos", articulos.join(", ")));
  }
  if (equipos.length > 0) {
    lines.push(buildLine("equipos", "Equipos", equipos.join(", ")));
  }
  if (itemsAnteriores.length > 0) {
    lines.push(buildLine("equipos-anteriores", "Equipos anteriores", itemsAnteriores.join(", ")));
  }
  if (itemsNuevos.length > 0) {
    lines.push(buildLine("equipos-nuevos", "Equipos nuevos", itemsNuevos.join(", ")));
  }

  const afectaStock = typeof info.afectaStock === "boolean" ? info.afectaStock : null;
  const afectaStockAnterior =
    typeof info.afectaStockAnterior === "boolean" ? info.afectaStockAnterior : null;
  const afectaStockNuevo =
    typeof info.afectaStockNuevo === "boolean" ? info.afectaStockNuevo : null;
  if (afectaStockAnterior !== null || afectaStockNuevo !== null) {
    lines.push(
      buildLine(
        "afecta-stock-cambio",
        "Afecta stock",
        `${afectaStockAnterior ? "Si" : "No"} -> ${afectaStockNuevo ? "Si" : "No"}`
      )
    );
  } else if (afectaStock !== null) {
    lines.push(buildLine("afecta-stock", "Afecta stock", afectaStock ? "Si" : "No"));
  }

  const totalUnidades = asText(info.totalUnidades);
  const totalUnidadesAnterior = asText(info.totalUnidadesAnterior);
  const totalUnidadesNuevo = asText(info.totalUnidadesNuevo);
  if (totalUnidadesAnterior || totalUnidadesNuevo) {
    lines.push(
      buildLine(
        "unidades-cambio",
        "Total unidades",
        `${totalUnidadesAnterior || "0"} -> ${totalUnidadesNuevo || "0"}`
      )
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
    CREATE: "Creó",
    UPDATE: "Actualizó",
    DELETE: "Eliminó",
    LOGIN: "Inició sesión",
    LOGIN_PERSONAL: "Inició sesión",
    LOGOUT: "Cerró sesión",
    PASSWORD_CHANGE: "Cambió contraseña",
    PASSWORD_CHANGE_PERSONAL: "Cambió contraseña",
  };
  return labels[accion] || accion;
}

export function auditEntityLabel(entidad: string): string {
  const labels: Record<string, string> = {
    AUTH: "autenticación",
    PERSONAL_AUTH: "autenticación",
    REGISTRO: "movimiento",
    PERSONAL: "personal",
    USUARIO: "usuario",
    RANGO: "grado",
    BATERIA: "batería",
    ARTICULO: "artículo",
    ARTICULO_STOCK: "stock de artículo",
    ARTICULO_ENTREGA_PERSONAL: "entrega de artículos",
    EQUIPO: "equipo",
    FIRMAS_CONFIG: "firmas institucionales",
    OBSERVACION: "observación",
    STOCK: "stock",
  };
  return labels[entidad] || entidad.toLowerCase();
}

export function formatAuditEntityId(entidadId: string | null, ciReferences?: AuditCiReferences) {
  if (!entidadId) return "Entidad sin ID";
  return `Entidad ID: ${formatAuditCi(entidadId, ciReferences)}`;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Sí" : "No";
  if (Array.isArray(val)) {
    if (
      val.every(
        (equipo) => equipo && typeof equipo === "object" && "tipo" in equipo && "valor" in equipo
      )
    ) {
      return val.map((t) => `${t.tipo}: ${t.valor}`).join(", ");
    }
    return val
      .map((equipo) =>
        equipo && typeof equipo === "object" ? JSON.stringify(equipo) : String(equipo)
      )
      .join(", ");
  }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function buildDiffLine(key: string, label: string, prevStr: string, nextStr: string) {
  return createElement(
    "div",
    {
      key,
      className: "text-[11px] text-stone-700 flex items-center gap-1.5 py-0.5 select-none w-full",
    },
    createElement(
      "span",
      { className: "font-semibold text-stone-900 w-24 shrink-0 truncate", title: label },
      `${label}:`
    ),
    createElement(
      "span",
      {
        className:
          "line-through text-red-700 bg-red-50 border border-red-200/50 px-1.5 py-0.25 rounded text-[10px] font-mono leading-none",
      },
      prevStr
    ),
    createElement("span", { className: "text-stone-400 font-bold text-[9px]" }, "→"),
    createElement(
      "span",
      {
        className:
          "text-green-700 bg-green-50 border border-green-200/50 px-1.5 py-0.25 rounded text-[10px] font-bold font-mono leading-none",
      },
      nextStr
    )
  );
}

export function renderAuditDetalle(
  detalle: unknown,
  ciReferences?: AuditCiReferences,
  accion?: string
): ReactNode {
  if (!isObject(detalle)) return "";

  // Simply render authentication/session events as clean status messages
  const isAuthEvent =
    accion === "LOGIN" ||
    accion === "LOGOUT" ||
    accion?.includes("PASSWORD") ||
    accion?.includes("CONTRASEÑA") ||
    accion?.includes("SESION") ||
    accion?.includes("SESSION") ||
    accion?.includes("AUTENTICACION") ||
    accion?.includes("AUTENTICACIÓN");

  if (isAuthEvent) {
    let msg = "🔑 Evento de seguridad registrado.";
    let icon = "🔑";
    let bg = "bg-stone-50 border-stone-200/55 text-stone-600";
    if (accion?.includes("LOGIN")) {
      msg = "Sesión iniciada correctamente.";
      icon = "🔑";
      bg = "bg-emerald-50 border-emerald-200/30 text-emerald-800 font-semibold";
    } else if (accion?.includes("LOGOUT")) {
      msg = "Sesión cerrada correctamente.";
      icon = "🚪";
      bg = "bg-stone-50 border-stone-200/55 text-stone-600 font-semibold";
    } else if (accion?.includes("PASSWORD") || accion?.includes("CONTRASEÑA")) {
      msg = "Contraseña cambiada correctamente.";
      icon = "🔒";
      bg = "bg-sky-50 border-sky-200/30 text-sky-800 font-semibold";
    }
    if (accion?.includes("FAIL") || accion?.includes("FALL")) {
      msg = "Intento de inicio de sesión fallido.";
      icon = "⚠️";
      bg = "bg-red-50 border-red-200/30 text-red-700 font-semibold";
    }
    return createElement(
      "div",
      {
        className: `mt-1 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 select-none w-max ${bg}`,
      },
      createElement("span", { className: "text-sm" }, icon),
      msg
    );
  }

  const isUndoEvent = detalle.evento === "UNDO_ACCION_AUDITORIA";
  if (isUndoEvent) {
    const detalleRecord = detalle as Record<string, unknown>;
    const audId = String(detalleRecord.auditoriaIdRestaurada ?? detalleRecord.auditoriaId ?? "");
    const msg = `Fue por un deshacer de la acción #${audId}`;
    const icon = "🔄";
    const bg = "bg-amber-50 border-amber-200/40 text-amber-800 font-semibold";
    return createElement(
      "div",
      {
        className: `mt-1 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 select-none w-max ${bg}`,
      },
      createElement("span", { className: "text-sm" }, icon),
      msg
    );
  }

  const IGNORED_DIFF_KEYS = new Set([
    "ip",
    "userAgent",
    "browser",
    "os",
    "device",
    "fecha",
    "username",
    "accountType",
    "evento",
    "password",
    "contraseña",
    "hash",
    "salt",
  ]);

  const lines: ReactNode[] = [];

  // Case 1: Granular comparative diff for before/after state snapshots (our state-aware audit logs)
  if (isObject(detalle.previo) && isObject(detalle.nuevo)) {
    const prev = detalle.previo;
    const next = detalle.nuevo;
    const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));

    for (const key of allKeys) {
      if (IGNORED_DIFF_KEYS.has(key)) continue;
      const prevVal = prev[key];
      const nextVal = next[key];

      if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
        const prevStr = formatValue(prevVal);
        const nextStr = formatValue(nextVal);
        const keyLabel = key === "ci" ? "CI" : key;
        lines.push(buildDiffLine(key, keyLabel, prevStr, nextStr));
      }
    }
  } else {
    // Case 2: Older flat structures or custom movement/creation payloads
    const flatKeys = Object.keys(detalle).filter((k) => {
      if (IGNORED_DIFF_KEYS.has(k)) return false;
      const val = detalle[k];
      return typeof val === "string" || typeof val === "number" || typeof val === "boolean";
    });

    const processedKeys = new Set<string>();

    // First pair up fields like XAnterior and XNuevo
    for (const k of flatKeys) {
      if (k.endsWith("Anterior")) {
        const base = k.slice(0, -8);
        const nuevoKey = flatKeys.find(
          (x) => x === `${base}Nuevo` || x === `${base}Nueva` || x === base
        );
        if (nuevoKey) {
          const prevStr = formatValue(detalle[k]);
          const nextStr = formatValue(detalle[nuevoKey]);
          const label = base === "ci" ? "CI" : base;
          lines.push(buildDiffLine(base, label, prevStr, nextStr));
          processedKeys.add(k);
          processedKeys.add(nuevoKey);
        }
      }
    }

    // For any remaining flat keys, represent them based on the action type (CREATE / DELETE / UPDATE)
    for (const k of flatKeys) {
      if (processedKeys.has(k) || k === "evento") continue;

      const valStr = formatValue(detalle[k]);
      const label = k === "ci" ? "CI" : k;

      if (accion === "CREATE") {
        // From non-existent to new value
        lines.push(buildDiffLine(k, label, "—", valStr));
      } else if (accion === "DELETE") {
        // From existing value to deleted
        lines.push(buildDiffLine(k, label, valStr, "—"));
      } else {
        // For general updates, show transition
        lines.push(buildDiffLine(k, label, "—", valStr));
      }
    }
  }

  // Fallback if no comparison lines were created (e.g. movements)
  const evento = asText(detalle.evento);
  if (lines.length === 0 && (evento.startsWith("MOVIMIENTO_") || evento.startsWith("STOCK_"))) {
    return renderMovimientoDetalle(detalle, ciReferences);
  }

  if (lines.length === 0) {
    // If there's still no comparative lines, fall back to flat list of simple properties, but show them as "— → Value"
    const keys = Object.keys(detalle).filter((key) => {
      const value = detalle[key];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    });
    for (const key of keys) {
      if (key === "evento") continue;
      const label = key === "ci" ? "CI" : key;
      lines.push(buildDiffLine(key, label, "—", formatValue(detalle[key])));
    }
  }

  return createElement(
    "div",
    { className: "mt-2 bg-stone-50/70 p-3 rounded-lg border border-stone-200 w-full" },
    createElement(
      "p",
      {
        className:
          "text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none",
      },
      createElement("span", { className: "inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" }),
      "Transición de Estado (Antes → Ahora):"
    ),
    createElement(
      "div",
      {
        className:
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-1 w-full",
      },
      ...lines
    )
  );
}

export function resolveAuditEntityName(
  entidad: string,
  detalle: unknown,
  ciReferences?: AuditCiReferences
): string | null {
  if (!detalle || typeof detalle !== "object" || Array.isArray(detalle)) return null;
  const det = detalle as Record<string, unknown>;

  // Extract from state snapshots if present
  const source = (
    isObject(det.nuevo) ? det.nuevo : isObject(det.previo) ? det.previo : det
  ) as Record<string, unknown>;

  if (entidad === "PERSONAL") {
    const p = source;
    const nameParts = [
      asText(p.apellido1),
      asText(p.apellido2),
      asText(p.nombre1),
      asText(p.nombre2),
    ].filter(Boolean);
    if (nameParts.length > 0) return nameParts.join(" ");
    if (p.ci && ciReferences) {
      const owner = ciReferences[normalizeCi(asText(p.ci))];
      if (owner) return owner;
    }
  }

  if (entidad === "GRADO_PERSONAL" || entidad === "RANGO") {
    if (source.nombreCompleto) return asText(source.nombreCompleto);
    if (source.abreviacion) return asText(source.abreviacion);
  }

  if (entidad === "BATERIA") {
    if (source.nombre) return `Batería: ${asText(source.nombre)}`;
  }

  if (entidad === "ARTICULO" || entidad === "EQUIPO") {
    if (source.nombre) return asText(source.nombre);
  }

  if (entidad === "OBSERVACION") {
    if (source.texto) {
      const truncated = asText(source.texto).substring(0, 40);
      return `Obs: "${truncated}${asText(source.texto).length > 40 ? "..." : ""}"`;
    }
  }

  if (entidad === "STOCK") {
    if (source.evento === "STOCK_OPERACION_CREATE" || source.tipo) {
      const tipo = asText(source.tipo) || "OPERACION";
      const total = asText(source.totalUnidades) || asText(source.cantidad);
      return `${tipo} (${total ? `${total} uds` : ""})`;
    }
  }

  if (entidad === "REGISTRO" || entidad === "MOVIMIENTO") {
    const tipo = asText(source.tipo) || "MOVIMIENTO";
    const total = asText(source.totalUnidades);
    return `${tipo} (${total ? `${total} uds` : ""})`;
  }

  // Fallback to name/nombre/abreviacion if present
  if (source.nombre) return asText(source.nombre);
  if (source.nombreCompleto) return asText(source.nombreCompleto);
  if (source.abreviacion) return asText(source.abreviacion);
  if (source.texto) return asText(source.texto).substring(0, 45);

  return null;
}
