import type { Prisma } from "@/generated/prisma/client";
import { buildEquipoTipoDescriptor } from "@/lib/equipo-tipos";

export const tipoEquipoRelationSelect = {
  tipoEquipoId: true,
  clave: true,
  nombre: true,
  orden: true,
} satisfies Prisma.TipoEquipoCatalogoSelect;

export function serializeEquipoTipoData(equipo: {
  tipoEquipoId: number | null;
  tipoEquipo?: {
    tipoEquipoId: number;
    clave: string;
    nombre: string;
    orden: number;
  } | null;
}) {
  return buildEquipoTipoDescriptor(equipo.tipoEquipo ?? null);
}
