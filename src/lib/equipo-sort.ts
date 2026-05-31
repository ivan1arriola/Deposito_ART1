import type { TipoEquipo } from "@/types/entities";
import { GENERAL_TIPO_EQUIPO_CLAVE, GENERAL_TIPO_EQUIPO_NOMBRE, GENERAL_TIPO_EQUIPO_ORDEN } from "@/lib/equipo-tipos";

type EquipoTipoLike = {
  tipo: TipoEquipo;
  tipoLabel?: string;
  tipoOrden?: number;
};

type EquipoNombreLike = EquipoTipoLike & {
  nombre: string;
};

type EquipoOrdenLike = EquipoNombreLike & {
  ordenPdf: number;
};

type EquipoTipoSection<T> = {
  key: TipoEquipo;
  label: string;
  order: number;
  items: T[];
};

function resolveTipoOrder(item: EquipoTipoLike | TipoEquipo) {
  if (typeof item === "string") {
    return item === GENERAL_TIPO_EQUIPO_CLAVE ? GENERAL_TIPO_EQUIPO_ORDEN : Number.MAX_SAFE_INTEGER;
  }
  if (typeof item.tipoOrden === "number" && Number.isFinite(item.tipoOrden)) {
    return item.tipoOrden;
  }
  if (item.tipo === GENERAL_TIPO_EQUIPO_CLAVE) return GENERAL_TIPO_EQUIPO_ORDEN;
  return Number.MAX_SAFE_INTEGER;
}

function resolveTipoLabel(item: EquipoTipoLike) {
  return item.tipoLabel?.trim() || (item.tipo === GENERAL_TIPO_EQUIPO_CLAVE ? GENERAL_TIPO_EQUIPO_NOMBRE : item.tipo);
}

export function compareTipoEquipo(left: TipoEquipo, right: TipoEquipo) {
  const leftOrder = resolveTipoOrder(left);
  const rightOrder = resolveTipoOrder(right);
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

export function compareEquipoNombre(left: string, right: string) {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

export function compareEquiposByTipoAndName<T extends EquipoNombreLike>(left: T, right: T) {
  const leftOrder = resolveTipoOrder(left);
  const rightOrder = resolveTipoOrder(right);
  const byTipo = leftOrder !== rightOrder
    ? leftOrder - rightOrder
    : resolveTipoLabel(left).localeCompare(resolveTipoLabel(right), "es", { sensitivity: "base" });
  if (byTipo !== 0) return byTipo;
  return compareEquipoNombre(left.nombre, right.nombre);
}

export function compareEquiposByTipoAndOrder<T extends EquipoOrdenLike>(left: T, right: T) {
  const leftOrder = resolveTipoOrder(left);
  const rightOrder = resolveTipoOrder(right);
  const byTipo = leftOrder !== rightOrder
    ? leftOrder - rightOrder
    : resolveTipoLabel(left).localeCompare(resolveTipoLabel(right), "es", { sensitivity: "base" });
  if (byTipo !== 0) return byTipo;
  if (left.ordenPdf !== right.ordenPdf) return left.ordenPdf - right.ordenPdf;
  return compareEquipoNombre(left.nombre, right.nombre);
}

export function groupEquiposByTipo<T extends EquipoTipoLike>(items: T[]): Array<EquipoTipoSection<T>> {
  const grouped = new Map<TipoEquipo, EquipoTipoSection<T>>();

  for (const item of items) {
    const existing = grouped.get(item.tipo);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    grouped.set(item.tipo, {
      key: item.tipo,
      label: resolveTipoLabel(item),
      order: resolveTipoOrder(item),
      items: [item],
    });
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.label.localeCompare(right.label, "es", { sensitivity: "base" });
  });
}
