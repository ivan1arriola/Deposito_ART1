CREATE TABLE IF NOT EXISTS "articulo_stock_movimiento" (
  "articulo_stock_movimiento_id" BIGSERIAL PRIMARY KEY,
  "articulo_id" SMALLINT NOT NULL REFERENCES "articulo"("articulo_id") ON DELETE RESTRICT,
  "cantidad" INTEGER NOT NULL,
  "comentario" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "articulo_stock_movimiento_cantidad_chk" CHECK ("cantidad" > 0)
);

CREATE INDEX IF NOT EXISTS "articulo_stock_movimiento_articulo_fecha_idx"
  ON "articulo_stock_movimiento"("articulo_id", "created_at" DESC);
