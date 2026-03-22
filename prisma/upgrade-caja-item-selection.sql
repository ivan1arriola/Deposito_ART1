BEGIN;

CREATE TABLE IF NOT EXISTS "caja_item" (
  "codigo_deposito_general" INTEGER NOT NULL,
  "item_id" BIGINT NOT NULL,
  PRIMARY KEY ("codigo_deposito_general", "item_id"),
  CONSTRAINT "caja_item_caja_fk"
    FOREIGN KEY ("codigo_deposito_general")
    REFERENCES "caja"("codigo_deposito_general")
    ON DELETE CASCADE,
  CONSTRAINT "caja_item_item_fk"
    FOREIGN KEY ("item_id")
    REFERENCES "item"("item_id")
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "caja_item_item_id_idx" ON "caja_item"("item_id");

INSERT INTO "caja_item" ("codigo_deposito_general", "item_id")
SELECT DISTINCT cics."codigo_deposito_general", ics."item_id"
FROM "caja_item_codigo_sie" cics
JOIN "item_codigo_sie" ics ON ics."codigo" = cics."codigo_sie"
ON CONFLICT ("codigo_deposito_general", "item_id") DO NOTHING;

COMMIT;
