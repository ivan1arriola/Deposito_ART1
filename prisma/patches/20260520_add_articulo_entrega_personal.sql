BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'tipo_articulo_stock_movimiento'
  ) THEN
    CREATE TYPE "tipo_articulo_stock_movimiento" AS ENUM ('INGRESO', 'EGRESO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "articulo_entrega_personal" (
  "articulo_entrega_personal_id" BIGSERIAL PRIMARY KEY,
  "personal_ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE RESTRICT,
  "usuario_entrega_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT,
  "ordenante_ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE RESTRICT,
  "fecha" DATE NOT NULL,
  "comentario" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "articulo_entrega_personal_fecha_hoy_chk" CHECK ("fecha" <= CURRENT_DATE)
);

CREATE INDEX IF NOT EXISTS "articulo_entrega_personal_personal_ci_fecha_idx"
  ON "articulo_entrega_personal"("personal_ci", "fecha" DESC);

CREATE INDEX IF NOT EXISTS "articulo_entrega_personal_usuario_entrega_id_fecha_idx"
  ON "articulo_entrega_personal"("usuario_entrega_id", "fecha" DESC);

CREATE INDEX IF NOT EXISTS "articulo_entrega_personal_ordenante_ci_fecha_idx"
  ON "articulo_entrega_personal"("ordenante_ci", "fecha" DESC);

ALTER TABLE "articulo_stock_movimiento"
ADD COLUMN IF NOT EXISTS "tipo" "tipo_articulo_stock_movimiento";

ALTER TABLE "articulo_stock_movimiento"
ADD COLUMN IF NOT EXISTS "articulo_entrega_personal_id" BIGINT;

UPDATE "articulo_stock_movimiento"
SET "tipo" = 'INGRESO'
WHERE "tipo" IS NULL;

ALTER TABLE "articulo_stock_movimiento"
ALTER COLUMN "tipo" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articulo_stock_movimiento_entrega_fk'
  ) THEN
    ALTER TABLE "articulo_stock_movimiento"
    ADD CONSTRAINT "articulo_stock_movimiento_entrega_fk"
      FOREIGN KEY ("articulo_entrega_personal_id")
      REFERENCES "articulo_entrega_personal"("articulo_entrega_personal_id")
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articulo_stock_movimiento_tipo_entrega_chk'
  ) THEN
    ALTER TABLE "articulo_stock_movimiento"
    ADD CONSTRAINT "articulo_stock_movimiento_tipo_entrega_chk"
      CHECK (
        ("tipo" = 'INGRESO' AND "articulo_entrega_personal_id" IS NULL)
        OR ("tipo" = 'EGRESO' AND "articulo_entrega_personal_id" IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "articulo_stock_movimiento_tipo_fecha_idx"
  ON "articulo_stock_movimiento"("tipo", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "articulo_stock_movimiento_entrega_fecha_idx"
  ON "articulo_stock_movimiento"("articulo_entrega_personal_id", "created_at" DESC);

COMMIT;
