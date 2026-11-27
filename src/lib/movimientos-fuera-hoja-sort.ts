import { compareOptionalOrder } from "@/lib/catalog-order";
import { parseDateInput } from "@/lib/date-helpers";

export type MovimientosFueraHojaSortField = "fecha" | "equipo" | "grado";
export type MovimientosFueraHojaSortDirection = "asc" | "desc";

export type MovimientosFueraHojaSort = {
  field: MovimientosFueraHojaSortField;
  direction: MovimientosFueraHojaSortDirection;
};

export const DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT: MovimientosFueraHojaSort = {
  field: "fecha",
  direction: "desc",
};

const collator = new Intl.Collator("es", {
  sensitivity: "base",
  numeric: true,
});

type MovimientosFueraHojaSortableRow = {
  movimientoId: string;
  fecha: string;
  persona: string;
  gradoAbreviacion: string;
  gradoOrden: number | null;
  equipo: string;
};

function compareDate(
  left: MovimientosFueraHojaSortableRow,
  right: MovimientosFueraHojaSortableRow
) {
  const leftKey = parseDateInput(left.fecha).sortKey ?? "";
  const rightKey = parseDateInput(right.fecha).sortKey ?? "";
  const byDate = leftKey.localeCompare(rightKey);
  if (byDate !== 0) return byDate;

  const byMovimiento = left.movimientoId.localeCompare(right.movimientoId, "es", { numeric: true });
  if (byMovimiento !== 0) return byMovimiento;

  return collator.compare(left.equipo, right.equipo);
}

function compareEquipo(
  left: MovimientosFueraHojaSortableRow,
  right: MovimientosFueraHojaSortableRow
) {
  const byItem = collator.compare(left.equipo, right.equipo);
  if (byItem !== 0) return byItem;

  const byPersona = collator.compare(left.persona, right.persona);
  if (byPersona !== 0) return byPersona;

  return compareDate(left, right);
}

function compareGrado(
  left: MovimientosFueraHojaSortableRow,
  right: MovimientosFueraHojaSortableRow
) {
  const byOrder = compareOptionalOrder(left.gradoOrden, right.gradoOrden);
  if (byOrder !== 0) return byOrder;

  const byAbreviacion = collator.compare(left.gradoAbreviacion, right.gradoAbreviacion);
  if (byAbreviacion !== 0) return byAbreviacion;

  const byPersona = collator.compare(left.persona, right.persona);
  if (byPersona !== 0) return byPersona;

  return compareDate(left, right);
}

function compareByField(
  left: MovimientosFueraHojaSortableRow,
  right: MovimientosFueraHojaSortableRow,
  field: MovimientosFueraHojaSortField
) {
  if (field === "equipo") return compareEquipo(left, right);
  if (field === "grado") return compareGrado(left, right);
  return compareDate(left, right);
}

export function sortMovimientosFueraHojaRows<T extends MovimientosFueraHojaSortableRow>(
  rows: T[],
  sort: MovimientosFueraHojaSort
): T[] {
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => factor * compareByField(left, right, sort.field));
}

export function parseMovimientosFueraHojaSort(
  sortByRaw: string | null | undefined,
  sortDirectionRaw: string | null | undefined
): MovimientosFueraHojaSort {
  const field =
    sortByRaw === "equipo" || sortByRaw === "grado" || sortByRaw === "fecha"
      ? sortByRaw
      : DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT.field;

  const direction =
    sortDirectionRaw === "asc" || sortDirectionRaw === "desc"
      ? sortDirectionRaw
      : DEFAULT_MOVIMIENTOS_FUERA_HOJA_SORT.direction;

  return {
    field,
    direction,
  };
}
