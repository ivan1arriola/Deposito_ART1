import { Prisma } from "@/generated/prisma/client";

type ItemOrderTx = Prisma.TransactionClient;

function clampOrderPosition(order: number, size: number) {
  if (size <= 0) return 0;
  return Math.min(Math.max(order - 1, 0), size);
}

export async function getOrderedItemIds(tx: ItemOrderTx, activo: boolean, excludeItemId?: bigint) {
  const items = await tx.item.findMany({
    where: {
      activo,
      ...(excludeItemId ? { itemId: { not: excludeItemId } } : {}),
    },
    orderBy: [{ ordenPdf: "asc" }, { itemId: "asc" }],
    select: { itemId: true },
  });

  return items.map((item) => item.itemId);
}

export function insertItemAtOrder(orderedIds: bigint[], itemId: bigint, order: number) {
  const nextOrder = orderedIds.filter((currentId) => currentId !== itemId);
  const targetIndex = clampOrderPosition(order, nextOrder.length);
  nextOrder.splice(targetIndex, 0, itemId);
  return nextOrder;
}

export async function applyItemOrder(tx: ItemOrderTx, orderedIds: bigint[], startOffset = 0) {
  if (orderedIds.length === 0) return;

  const valueTuples = orderedIds.map((itemId, index) => Prisma.sql`(${itemId}, ${startOffset + index + 1})`);
  await tx.$executeRaw`
    UPDATE "public"."item" AS i
    SET "orden_pdf" = v.orden_pdf::int
    FROM (VALUES ${Prisma.join(valueTuples)}) AS v(item_id, orden_pdf)
    WHERE i."item_id" = v.item_id::bigint
  `;
}

export async function getNextItemOrder(tx: ItemOrderTx, activo: boolean) {
  const itemIds = await getOrderedItemIds(tx, activo);
  const offset = activo ? 0 : 10000;
  return offset + itemIds.length + 1;
}

export async function normalizeItemOrders(tx: ItemOrderTx, activo: boolean) {
  const itemIds = await getOrderedItemIds(tx, activo);
  const offset = activo ? 0 : 10000;
  await applyItemOrder(tx, itemIds, offset);
}
