DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_stock_operacion') THEN
    CREATE TYPE "tipo_stock_operacion" AS ENUM ('INGRESO', 'EGRESO');
  END IF;
END $$;

ALTER TABLE "registro"
  ADD COLUMN IF NOT EXISTS "afecta_stock" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS "stock_operacion" (
  "stock_operacion_id" BIGSERIAL PRIMARY KEY,
  "fecha" DATE NOT NULL,
  "tipo" "tipo_stock_operacion" NOT NULL,
  "comentarios" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "stock_operacion_fecha_idx" ON "stock_operacion"("fecha" DESC);

CREATE TABLE IF NOT EXISTS "stock_operacion_item" (
  "stock_operacion_id" BIGINT NOT NULL REFERENCES "stock_operacion"("stock_operacion_id") ON DELETE CASCADE,
  "item_id" BIGINT NOT NULL REFERENCES "item"("item_id"),
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("stock_operacion_id", "item_id")
);

CREATE INDEX IF NOT EXISTS "stock_operacion_item_item_id_idx" ON "stock_operacion_item"("item_id");
