import { parseDateInput } from "@/lib/date-helpers";

export type MovimientosEquipoSortField = "fecha" | "tipo";
export type MovimientosEquipoSortDirection = "asc" | "desc";

export type MovimientosEquipoSort = {
  field: MovimientosEquipoSortField;
  direction: MovimientosEquipoSortDirection;
};

export const DEFAULT_MOVIMIENTOS_EQUIPO_SORT: MovimientosEquipoSort = {
  field: "fecha",
  direction: "desc",
};

const collator = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

type MovimientosEquipoSortableRow = {
  movimientoId: string;
  fecha: string;
  tipoLabel: string;
  persona: string;
};

function compareDate(left: MovimientosEquipoSortableRow, right: MovimientosEquipoSortableRow) {
  const leftKey = parseDateInput(left.fecha).sortKey ?? "";
  const rightKey = parseDateInput(right.fecha).sortKey ?? "";
  const byDate = leftKey.localeCompare(rightKey);
  if (byDate !== 0) return byDate;

  const byMovimiento = left.movimientoId.localeCompare(right.movimientoId, "es", { numeric: true });
  if (byMovimiento !== 0) return byMovimiento;

  return collator.compare(left.persona, right.persona);
}

function compareTipo(left: MovimientosEquipoSortableRow, right: MovimientosEquipoSortableRow) {
  const byTipo = collator.compare(left.tipoLabel, right.tipoLabel);
  if (byTipo !== 0) return byTipo;

  return compareDate(left, right);
}

function compareByField(
  left: MovimientosEquipoSortableRow,
  right: MovimientosEquipoSortableRow,
  field: MovimientosEquipoSortField,
) {
  if (field === "tipo") return compareTipo(left, right);
  return compareDate(left, right);
}

export function sortMovimientosEquipoRows<T extends MovimientosEquipoSortableRow>(
  rows: T[],
  sort: MovimientosEquipoSort,
): T[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => factor * compareByField(left, right, sort.field));
}

export function parseMovimientosEquipoSort(
  sortByRaw: string | null | undefined,
  sortDirectionRaw: string | null | undefined,
): MovimientosEquipoSort {
  const field =
    sortByRaw === "fecha" || sortByRaw === "tipo"
      ? sortByRaw
      : DEFAULT_MOVIMIENTOS_EQUIPO_SORT.field;

  const direction =
    sortDirectionRaw === "asc" || sortDirectionRaw === "desc"
      ? sortDirectionRaw
      : DEFAULT_MOVIMIENTOS_EQUIPO_SORT.direction;

  return {
    field,
    direction,
  };
}
