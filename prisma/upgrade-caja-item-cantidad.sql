BEGIN;

ALTER TABLE "caja_item"
  ADD COLUMN IF NOT EXISTS "cantidad" INTEGER;

UPDATE "caja_item"
SET "cantidad" = 1
WHERE "cantidad" IS NULL OR "cantidad" <= 0;

ALTER TABLE "caja_item"
  ALTER COLUMN "cantidad" SET DEFAULT 1;

ALTER TABLE "caja_item"
  ALTER COLUMN "cantidad" SET NOT NULL;

ALTER TABLE "caja_item"
  DROP CONSTRAINT IF EXISTS "caja_item_cantidad_chk";

ALTER TABLE "caja_item"
  ADD CONSTRAINT "caja_item_cantidad_chk" CHECK ("cantidad" > 0);

UPDATE "caja" c
SET "cantidad" = totals.total_cantidad
FROM (
  SELECT ci."codigo_deposito_general", SUM(ci."cantidad")::INTEGER AS total_cantidad
  FROM "caja_item" ci
  GROUP BY ci."codigo_deposito_general"
) totals
WHERE c."codigo_deposito_general" = totals."codigo_deposito_general";

COMMIT;
