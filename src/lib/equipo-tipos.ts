import { stripDiacritics } from "@/lib/spanish-text";
import type { EquipoTipo, TipoEquipo } from "@/types/entities";

export const GENERAL_TIPO_EQUIPO_CLAVE = "GENERAL";
export const GENERAL_TIPO_EQUIPO_NOMBRE = "General";
export const GENERAL_TIPO_EQUIPO_ORDEN = 0;

type EquipoTipoRecordLike = {
  tipoEquipoId: number;
  clave: string;
  nombre: string;
  orden: number;
};

type EquipoTipoDescriptor = {
  tipo: TipoEquipo;
  tipoEquipoId: number | null;
  tipoLabel: string;
  tipoOrden: number;
};

export function normalizeEquipoTipoClave(value: string) {
  return stripDiacritics(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export function buildEquipoTipoDescriptor(tipoEquipo: EquipoTipoRecordLike | null | undefined): EquipoTipoDescriptor {
  if (!tipoEquipo) {
    return {
      tipo: GENERAL_TIPO_EQUIPO_CLAVE,
      tipoEquipoId: null,
      tipoLabel: GENERAL_TIPO_EQUIPO_NOMBRE,
      tipoOrden: GENERAL_TIPO_EQUIPO_ORDEN,
    };
  }

  return {
    tipo: tipoEquipo.clave,
    tipoEquipoId: tipoEquipo.tipoEquipoId,
    tipoLabel: tipoEquipo.nombre,
    tipoOrden: Math.max(1, tipoEquipo.orden),
  };
}

export function buildEquipoTipoOptions<T extends EquipoTipoRecordLike>(tipos: T[]): EquipoTipo[] {
  const ordered = [...tipos].sort((left, right) => {
    if (left.orden !== right.orden) return left.orden - right.orden;
    return left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" });
  });

  return [
    {
      tipoEquipoId: null,
      clave: GENERAL_TIPO_EQUIPO_CLAVE,
      nombre: GENERAL_TIPO_EQUIPO_NOMBRE,
      orden: GENERAL_TIPO_EQUIPO_ORDEN,
      esGeneral: true,
    },
    ...ordered.map((tipo) => ({
      tipoEquipoId: tipo.tipoEquipoId,
      clave: tipo.clave,
      nombre: tipo.nombre,
      orden: Math.max(1, tipo.orden),
      esGeneral: false,
    })),
  ];
}
