CREATE TABLE IF NOT EXISTS item_codigo (
  item_codigo_id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES item(item_id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  aclaracion TEXT,
  orden INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS item_codigo_item_orden_idx ON item_codigo (item_id, orden);
