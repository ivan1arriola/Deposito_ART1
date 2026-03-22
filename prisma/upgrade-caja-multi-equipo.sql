BEGIN;

ALTER TABLE "caja_item_codigo_sie" DROP CONSTRAINT IF EXISTS "caja_item_codigo_sie_caja_fk";
ALTER TABLE "caja_item_codigo_sie" DROP CONSTRAINT IF EXISTS "caja_item_codigo_sie_codigo_fk";

ALTER TABLE "caja" DROP CONSTRAINT IF EXISTS "caja_codigo_item_uq";

DROP INDEX IF EXISTS "caja_item_id_idx";
DROP INDEX IF EXISTS "caja_item_codigo_sie_codigo_item_idx";
DROP INDEX IF EXISTS "caja_item_codigo_sie_item_id_idx";

ALTER TABLE "caja_item_codigo_sie" DROP COLUMN IF EXISTS "item_id";
ALTER TABLE "caja" DROP COLUMN IF EXISTS "item_id";

ALTER TABLE "caja_item_codigo_sie"
  ADD CONSTRAINT "caja_item_codigo_sie_caja_fk"
  FOREIGN KEY ("codigo_deposito_general")
  REFERENCES "caja"("codigo_deposito_general")
  ON DELETE CASCADE;

ALTER TABLE "caja_item_codigo_sie"
  ADD CONSTRAINT "caja_item_codigo_sie_codigo_fk"
  FOREIGN KEY ("codigo_sie")
  REFERENCES "item_codigo_sie"("codigo")
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "caja_item_codigo_sie_codigo_idx" ON "caja_item_codigo_sie"("codigo_sie");

COMMIT;
