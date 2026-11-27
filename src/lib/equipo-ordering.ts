import { Prisma } from "@/generated/prisma/client";

type ItemOrderTx = Prisma.TransactionClient;

function clampOrderPosition(order: number, size: number) {
  if (size <= 0) return 0;
  return Math.min(Math.max(order - 1, 0), size);
}

export async function getOrderedEquipoIds(tx: ItemOrderTx, activo: boolean, excludeItemId?: bigint) {
  const equipos = await tx.equipo.findMany({
    where: {
      activo,
      ...(excludeItemId ? { equipoId: { not: excludeItemId } } : {}),
    },
    orderBy: [{ ordenPdf: "asc" }, { equipoId: "asc" }],
    select: { equipoId: true },
  });

  return equipos.map((equipo) => equipo.equipoId);
}

export function insertEquipoAtOrder(orderedIds: bigint[], equipoId: bigint, order: number) {
  const nextOrder = orderedIds.filter((currentId) => currentId !== equipoId);
  const targetIndex = clampOrderPosition(order, nextOrder.length);
  nextOrder.splice(targetIndex, 0, equipoId);
  return nextOrder;
}

export async function applyEquipoOrder(tx: ItemOrderTx, orderedIds: bigint[], startOffset = 0) {
  if (orderedIds.length === 0) return;

  const valueTuples = orderedIds.map((equipoId, index) => Prisma.sql`(${equipoId}, ${startOffset + index + 1})`);
  await tx.$executeRaw`
    UPDATE "public"."equipos" AS i
    SET "orden_pdf" = v.orden_pdf::int
    FROM (VALUES ${Prisma.join(valueTuples)}) AS v(equipo_id, orden_pdf)
    WHERE i."equipo_id" = v.equipo_id::bigint
  `;
}
