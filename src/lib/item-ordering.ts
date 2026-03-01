import { Prisma } from "@prisma/client";

type ItemOrderTx = Prisma.TransactionClient;

export async function getNextItemOrder(tx: ItemOrderTx, activo: boolean) {
  const count = await tx.item.count({ where: { activo } });
  return count + 1;
}

export async function normalizeItemOrders(tx: ItemOrderTx, activo: boolean) {
  await tx.$executeRaw`
    WITH ordered AS (
      SELECT
        "item_id",
        ROW_NUMBER() OVER (ORDER BY "orden_pdf" ASC, "nombre" ASC, "item_id" ASC) AS new_order
      FROM "item"
      WHERE "activo" = ${activo}
    )
    UPDATE "item" AS target
    SET "orden_pdf" = ordered.new_order
    FROM ordered
    WHERE target."item_id" = ordered."item_id"
      AND target."orden_pdf" <> ordered.new_order
  `;
}
