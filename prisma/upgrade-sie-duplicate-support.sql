BEGIN;

ALTER TABLE "caja_item_codigo_sie" DROP CONSTRAINT IF EXISTS "caja_item_codigo_sie_codigo_fk";
ALTER TABLE "caja_item_codigo_sie" DROP CONSTRAINT IF EXISTS "caja_item_codigo_sie_sie_fk";

ALTER TABLE "item_codigo_sie" ADD COLUMN IF NOT EXISTS "item_codigo_sie_id" BIGINT;

CREATE SEQUENCE IF NOT EXISTS "item_codigo_sie_item_codigo_sie_id_seq";
ALTER SEQUENCE "item_codigo_sie_item_codigo_sie_id_seq" OWNED BY "item_codigo_sie"."item_codigo_sie_id";
ALTER TABLE "item_codigo_sie"
  ALTER COLUMN "item_codigo_sie_id" SET DEFAULT nextval('"item_codigo_sie_item_codigo_sie_id_seq"');

UPDATE "item_codigo_sie"
SET "item_codigo_sie_id" = nextval('"item_codigo_sie_item_codigo_sie_id_seq"')
WHERE "item_codigo_sie_id" IS NULL;

SELECT setval(
  '"item_codigo_sie_item_codigo_sie_id_seq"',
  GREATEST(COALESCE((SELECT MAX("item_codigo_sie_id") FROM "item_codigo_sie"), 0), 1),
  true
);

UPDATE "item_codigo_sie"
SET "talla" = '-'
WHERE "talla" IS NULL OR btrim("talla") = '';

ALTER TABLE "item_codigo_sie"
  ALTER COLUMN "item_codigo_sie_id" SET NOT NULL;

ALTER TABLE "item_codigo_sie"
  ALTER COLUMN "talla" SET DEFAULT '-';

ALTER TABLE "item_codigo_sie"
  ALTER COLUMN "talla" SET NOT NULL;

ALTER TABLE "caja_item_codigo_sie" ADD COLUMN IF NOT EXISTS "item_codigo_sie_id" BIGINT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'caja_item_codigo_sie'
      AND column_name = 'codigo_sie'
  ) THEN
    UPDATE "caja_item_codigo_sie" cics
    SET "item_codigo_sie_id" = ics."item_codigo_sie_id"
    FROM "item_codigo_sie" ics
    WHERE cics."item_codigo_sie_id" IS NULL
      AND cics."codigo_sie" = ics."codigo";
  END IF;
END $$;

ALTER TABLE "caja_item_codigo_sie"
  ALTER COLUMN "item_codigo_sie_id" SET NOT NULL;

ALTER TABLE "item_codigo_sie" DROP CONSTRAINT IF EXISTS "item_codigo_sie_codigo_item_uq";
ALTER TABLE "item_codigo_sie" DROP CONSTRAINT IF EXISTS "item_codigo_sie_codigo_item_id_key";
ALTER TABLE "item_codigo_sie" DROP CONSTRAINT IF EXISTS "item_codigo_sie_codigo_talla_item_uq";
DROP INDEX IF EXISTS "item_codigo_sie_codigo_item_id_key";
ALTER TABLE "item_codigo_sie" DROP CONSTRAINT IF EXISTS "item_codigo_sie_pkey";
ALTER TABLE "item_codigo_sie"
  ADD CONSTRAINT "item_codigo_sie_pkey" PRIMARY KEY ("item_codigo_sie_id");
ALTER TABLE "item_codigo_sie"
  ADD CONSTRAINT "item_codigo_sie_codigo_talla_item_uq" UNIQUE ("codigo", "talla", "item_id");

ALTER TABLE "caja_item_codigo_sie" DROP CONSTRAINT IF EXISTS "caja_item_codigo_sie_pkey";
ALTER TABLE "caja_item_codigo_sie"
  ADD CONSTRAINT "caja_item_codigo_sie_pkey" PRIMARY KEY ("codigo_deposito_general", "item_codigo_sie_id");

ALTER TABLE "caja_item_codigo_sie"
  ADD CONSTRAINT "caja_item_codigo_sie_sie_fk"
  FOREIGN KEY ("item_codigo_sie_id")
  REFERENCES "item_codigo_sie"("item_codigo_sie_id")
  ON DELETE CASCADE;

DROP INDEX IF EXISTS "item_codigo_sie_codigo_idx";
CREATE INDEX IF NOT EXISTS "item_codigo_sie_codigo_idx" ON "item_codigo_sie"("codigo");

DROP INDEX IF EXISTS "caja_item_codigo_sie_codigo_idx";
DROP INDEX IF EXISTS "caja_item_codigo_sie_sie_id_idx";
CREATE INDEX IF NOT EXISTS "caja_item_codigo_sie_sie_id_idx" ON "caja_item_codigo_sie"("item_codigo_sie_id");

ALTER TABLE "caja_item_codigo_sie" DROP COLUMN IF EXISTS "codigo_sie";

COMMIT;
