import type { TipoEquipo } from "@/types/entities";

type EquipoTipoLike = {
  tipo: TipoEquipo;
};

type EquipoNombreLike = EquipoTipoLike & {
  nombre: string;
};

type EquipoOrdenLike = EquipoNombreLike & {
  ordenPdf: number;
};

const TIPO_EQUIPO_ORDER: Record<TipoEquipo, number> = {
  GENERAL: 0,
  FRI: 1,
};

export function compareTipoEquipo(left: TipoEquipo, right: TipoEquipo) {
  return TIPO_EQUIPO_ORDER[left] - TIPO_EQUIPO_ORDER[right];
}

export function compareEquipoNombre(left: string, right: string) {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

export function compareEquiposByTipoAndName<T extends EquipoNombreLike>(left: T, right: T) {
  const byTipo = compareTipoEquipo(left.tipo, right.tipo);
  if (byTipo !== 0) return byTipo;
  return compareEquipoNombre(left.nombre, right.nombre);
}

export function compareEquiposByTipoAndOrder<T extends EquipoOrdenLike>(left: T, right: T) {
  const byTipo = compareTipoEquipo(left.tipo, right.tipo);
  if (byTipo !== 0) return byTipo;
  if (left.ordenPdf !== right.ordenPdf) return left.ordenPdf - right.ordenPdf;
  return compareEquipoNombre(left.nombre, right.nombre);
}

export function splitEquiposByTipo<T extends EquipoTipoLike>(items: T[]) {
  const generales: T[] = [];
  const fri: T[] = [];

  for (const item of items) {
    if (item.tipo === "FRI") {
      fri.push(item);
    } else {
      generales.push(item);
    }
  }

  return { generales, fri };
}
