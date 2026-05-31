import { Prisma } from "@/generated/prisma/client";

type TipoEquipoOrderTx = Pick<Prisma.TransactionClient, "tipoEquipoCatalogo" | "$executeRaw">;

function clampTipoEquipoOrder(order: number, size: number) {
  if (size <= 0) return 0;
  return Math.min(Math.max(order - 1, 0), size);
}

export async function getOrderedTipoEquipoIds(tx: TipoEquipoOrderTx, excludeTipoEquipoId?: number) {
  const tipos = await tx.tipoEquipoCatalogo.findMany({
    where: excludeTipoEquipoId ? { tipoEquipoId: { not: excludeTipoEquipoId } } : undefined,
    orderBy: [{ orden: "asc" }, { nombre: "asc" }, { tipoEquipoId: "asc" }],
    select: { tipoEquipoId: true },
  });

  return tipos.map((tipo) => tipo.tipoEquipoId);
}

export function insertTipoEquipoAtOrder(orderedIds: number[], tipoEquipoId: number, order?: number | null) {
  const nextOrder = orderedIds.filter((currentId) => currentId !== tipoEquipoId);
  const targetIndex = order === undefined || order === null ? nextOrder.length : clampTipoEquipoOrder(order, nextOrder.length);
  nextOrder.splice(targetIndex, 0, tipoEquipoId);
  return nextOrder;
}

export async function applyTipoEquipoOrder(tx: TipoEquipoOrderTx, orderedIds: number[]) {
  if (orderedIds.length === 0) return;

  const valueTuples = orderedIds.map((tipoEquipoId, index) => Prisma.sql`(${tipoEquipoId}, ${index + 1})`);
  await tx.$executeRaw`
    UPDATE "public"."tipo_equipo" AS t
    SET "orden" = v.orden::smallint
    FROM (VALUES ${Prisma.join(valueTuples)}) AS v(tipo_equipo_id, orden)
    WHERE t."tipo_equipo_id" = v.tipo_equipo_id::smallint
  `;
}
