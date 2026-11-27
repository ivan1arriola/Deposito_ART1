import type { EquipoMovimientoViewRow } from "@/types/views";

export type MovimientosEquipoTipoFilter =
  "ENTREGA" | "DEVOLUCION" | "ASIGNACION" | "PRESTAMO_PENDIENTE";

export const DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS: MovimientosEquipoTipoFilter[] = [
  "ENTREGA",
  "DEVOLUCION",
  "ASIGNACION",
  "PRESTAMO_PENDIENTE",
];

const VALID_TIPO_FILTERS = new Set<MovimientosEquipoTipoFilter>(
  DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS
);

function normalizeTipoFilters(filters: readonly string[]): MovimientosEquipoTipoFilter[] {
  const normalized: MovimientosEquipoTipoFilter[] = [];
  for (const raw of filters) {
    const value = raw.trim().toUpperCase() as MovimientosEquipoTipoFilter;
    if (!VALID_TIPO_FILTERS.has(value)) continue;
    if (normalized.includes(value)) continue;
    normalized.push(value);
  }
  return normalized.length > 0 ? normalized : [...DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS];
}

export function parseMovimientosEquipoTipoFilters(
  raw: string | null | undefined
): MovimientosEquipoTipoFilter[] {
  if (!raw) return [...DEFAULT_MOVIMIENTOS_EQUIPO_TIPO_FILTERS];
  return normalizeTipoFilters(raw.split(","));
}

export function serializeMovimientosEquipoTipoFilters(
  filters: readonly MovimientosEquipoTipoFilter[]
): string {
  return normalizeTipoFilters(filters).join(",");
}

export function applyMovimientosEquipoTipoFilters(
  rows: readonly EquipoMovimientoViewRow[],
  filters: readonly MovimientosEquipoTipoFilter[]
): EquipoMovimientoViewRow[] {
  const enabled = new Set(normalizeTipoFilters(filters));

  return rows.filter((row) => {
    if (row.tipo === "ENTREGA") return enabled.has("ENTREGA");
    if (row.tipo === "DEVOLUCION") return enabled.has("DEVOLUCION");
    if (row.tipo === "ASIGNACION") return enabled.has("ASIGNACION");

    return enabled.has("PRESTAMO_PENDIENTE") && row.prestamoEstado === "PENDIENTE";
  });
}
