import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { normalizeSearchText } from "@/lib/spanish-text";
import type { OficialSuboficial, Personal } from "@/types/entities";
import type { PrestamoClase, PrestamoDraft, PrestamoEstadoEquipo } from "@/types/forms";

export const ESTADO_OPTIONS: PrestamoEstadoEquipo[] = ["NUEVO", "BUENO", "REGULAR", "MALO"];

export function estadoBadgeClass(estado: "PENDIENTE" | "DEVUELTO") {
  return estado === "PENDIENTE" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
}

export function reciboHref(prestamoId: string) {
  return `/api/prestamos/${encodeURIComponent(prestamoId)}/recibo`;
}

function normalizeRankForActuante(value: string) {
  return normalizeSearchText(value.replace(/[º°]/g, ""));
}

function isSargentoRank(abreviacion: string) {
  const normalized = normalizeRankForActuante(abreviacion);
  return normalized.includes("sargento") || normalized.startsWith("sgto");
}

export function destinatarioTipoLabel(value: PrestamoDraft["destinatarioTipo"]) {
  if (value === "OFICIAL") return "Oficiales";
  if (value === "SUBOFICIAL") return "Suboficiales";
  return "Subalternos";
}

export function prestamoClaseLabel(value: PrestamoClase) {
  if (value === "EXTERNO") return "Préstamo externo";
  if (value === "PENDIENTE") return "Destinatario pendiente";
  return "Préstamo interno";
}

export function buildDestinatarioOptions(
  destinatarioTipo: PrestamoDraft["destinatarioTipo"],
  personal: Personal[],
  oficialesSuboficiales: OficialSuboficial[]
) {
  if (destinatarioTipo === "PERSONAL") {
    return [...personal]
      .sort((a, b) =>
        `${apellidosLabel(a)} ${nombresLabel(a)}`.localeCompare(
          `${apellidosLabel(b)} ${nombresLabel(b)}`,
          "es",
          {
            sensitivity: "base",
          }
        )
      )
      .map((persona) => ({
        ci: persona.ci,
        label: `${persona.rango.abreviacion} ${apellidosLabel(persona)}, ${nombresLabel(persona)}`,
      }));
  }

  return oficialesSuboficiales
    .filter((registro) =>
      destinatarioTipo === "OFICIAL" ? registro.tipo === "OFICIAL" : registro.tipo === "SUBOFICIAL"
    )
    .slice()
    .sort((a, b) =>
      `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es", {
        sensitivity: "base",
      })
    )
    .map((registro) => ({
      ci: registro.ci,
      label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`,
    }));
}

export function buildActuanteOptions(
  oficialesSuboficiales: OficialSuboficial[],
  personal: Personal[]
) {
  const oficialesYSuboficiales = oficialesSuboficiales.map((registro) => ({
    ci: registro.ci,
    label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`
      .replace(/\s+/g, " ")
      .trim(),
  }));

  const sargentos = personal
    .filter((persona) => isSargentoRank(persona.rango.abreviacion))
    .map((persona) => ({
      ci: persona.ci,
      label: `${persona.rango.abreviacion} ${apellidosLabel(persona)}, ${nombresLabel(persona)}`
        .replace(/\s+/g, " ")
        .trim(),
    }));

  const optionsByCi = new Map<string, { ci: string; label: string }>();
  for (const option of [...oficialesYSuboficiales, ...sargentos]) {
    if (!optionsByCi.has(option.ci)) {
      optionsByCi.set(option.ci, option);
    }
  }

  return Array.from(optionsByCi.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es", { sensitivity: "base" })
  );
}
