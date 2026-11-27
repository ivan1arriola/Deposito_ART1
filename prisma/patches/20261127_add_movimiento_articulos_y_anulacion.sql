-- Parche idempotente (#17): artículos en asignaciones (movimiento_articulo), vínculo contable y anulación lógica.
ALTER TABLE "movimiento"
  ADD COLUMN IF NOT EXISTS "anulado" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "anulado_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "anulado_por_usuario_id" TEXT REFERENCES "usuario"("usuario_id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "motivo_anulacion" TEXT;

CREATE INDEX IF NOT EXISTS "movimiento_anulado_idx"
  ON "movimiento"("anulado");

ALTER TABLE "articulo_stock_movimiento"
  ADD COLUMN IF NOT EXISTS "movimiento_id" BIGINT REFERENCES "movimiento"("movimiento_id") ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "articulo_stock_movimiento_movimiento_fecha_idx"
  ON "articulo_stock_movimiento"("movimiento_id", "created_at" DESC);

ALTER TABLE "articulo_stock_movimiento"
  DROP CONSTRAINT IF EXISTS "articulo_stock_movimiento_tipo_entrega_chk";

ALTER TABLE "articulo_stock_movimiento"
  ADD CONSTRAINT "articulo_stock_movimiento_tipo_entrega_chk" CHECK (
    ("tipo" = 'INGRESO' AND "articulo_entrega_personal_id" IS NULL)
    OR (
      "tipo" = 'EGRESO'
      AND ("articulo_entrega_personal_id" IS NOT NULL OR "movimiento_id" IS NOT NULL)
    )
  );

CREATE TABLE IF NOT EXISTS "movimiento_articulo" (
  "movimiento_id" BIGINT NOT NULL REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "articulo_id" SMALLINT NOT NULL REFERENCES "articulo"("articulo_id") ON DELETE RESTRICT,
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("movimiento_id", "articulo_id")
);

CREATE INDEX IF NOT EXISTS "movimiento_articulo_articulo_id_idx"
  ON "movimiento_articulo"("articulo_id");
