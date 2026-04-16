import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { normalizeSearchText } from "@/lib/spanish-text";
import type { OficialSuboficial, Personal } from "@/types/entities";
import type { PrestamoDraft, PrestamoEstadoEquipo } from "@/types/forms";
import type { StockDashboardData } from "@/types/views";
import type { StockSection } from "./types";

export const ESTADO_OPTIONS: PrestamoEstadoEquipo[] = ["NUEVO", "BUENO", "REGULAR", "MALO"];

export function historyBadgeClass(tipo: "INGRESO" | "EGRESO" | "ENTREGA" | "DEVOLUCION" | "PRESTAMO" | "DEVOLUCION_PRESTAMO") {
  if (tipo === "INGRESO" || tipo === "DEVOLUCION" || tipo === "DEVOLUCION_PRESTAMO") return "bg-emerald-100 text-emerald-800";
  if (tipo === "PRESTAMO") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
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

export function buildDestinatarioOptions(
  destinatarioTipo: PrestamoDraft["destinatarioTipo"],
  personal: Personal[],
  oficialesSuboficiales: OficialSuboficial[],
) {
  if (destinatarioTipo === "PERSONAL") {
    return [...personal]
      .sort((a, b) =>
        `${apellidosLabel(a)} ${nombresLabel(a)}`.localeCompare(`${apellidosLabel(b)} ${nombresLabel(b)}`, "es", {
          sensitivity: "base",
        }),
      )
      .map((persona) => ({
        ci: persona.ci,
        label: `${persona.rango.abreviacion} ${apellidosLabel(persona)}, ${nombresLabel(persona)}`,
      }));
  }

  return oficialesSuboficiales
    .filter((registro) => (destinatarioTipo === "OFICIAL" ? registro.tipo === "OFICIAL" : registro.tipo === "SUBOFICIAL"))
    .slice()
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es", { sensitivity: "base" }))
    .map((registro) => ({
      ci: registro.ci,
      label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`,
    }));
}

export function buildActuanteOptions(oficialesSuboficiales: OficialSuboficial[], personal: Personal[]) {
  const oficialesYSuboficiales = oficialesSuboficiales.map((registro) => ({
    ci: registro.ci,
    label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`.replace(/\s+/g, " ").trim(),
  }));

  const sargentos = personal
    .filter((persona) => isSargentoRank(persona.rango.abreviacion))
    .map((persona) => ({
      ci: persona.ci,
      label: `${persona.rango.abreviacion} ${apellidosLabel(persona)}, ${nombresLabel(persona)}`.replace(/\s+/g, " ").trim(),
    }));

  const optionsByCi = new Map<string, { ci: string; label: string }>();
  for (const option of [...oficialesYSuboficiales, ...sargentos]) {
    if (!optionsByCi.has(option.ci)) {
      optionsByCi.set(option.ci, option);
    }
  }

  return Array.from(optionsByCi.values()).sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
}

export function getStockSummaryMetrics(resumen: StockDashboardData["resumen"]) {
  const totalSubalternos = resumen.reduce((total, item) => total + item.stockSubalternos, 0);
  const totalPrestamo = resumen.reduce((total, item) => total + item.stockPrestamo, 0);
  const totalDeposito = resumen.reduce((total, item) => total + item.stockDeposito, 0);
  const totalUnidad = resumen.reduce((total, item) => total + item.stockUnidad, 0);
  const itemsConStockDeposito = resumen.filter((item) => item.stockDeposito !== 0).length;
  const itemsNegativosDeposito = resumen.filter((item) => item.stockDeposito < 0).length;

  return {
    totalSubalternos,
    totalPrestamo,
    totalDeposito,
    totalUnidad,
    itemsConStockDeposito,
    itemsNegativosDeposito,
  };
}

export function getSectionViewConfig(section: StockSection) {
  return {
    showSummaryCards: section === "total" || section === "actual",
    showManualForm: section === "alta" || section === "baja",
    showStockTable: section === "total" || section === "actual",
    showHistory: section === "historial",
    showPrestamos: section === "prestamos",
    viewTitle:
      section === "total"
        ? "Total de equipos en la unidad"
        : section === "actual"
          ? "Stock interno de deposito"
          : section === "alta"
            ? "Alta de stock"
            : section === "baja"
              ? "Baja de stock"
              : section === "prestamos"
                ? "Prestamos de equipo"
                : "Historial de stock",
    stockTableTitle:
      section === "total"
        ? "Totales por item (subalternos + préstamo + depósito)"
        : "Stock interno de depósito por equipo",
  };
}
