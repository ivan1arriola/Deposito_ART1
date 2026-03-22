BEGIN;

ALTER TABLE "item_codigo_sie" DROP CONSTRAINT IF EXISTS "item_codigo_sie_codigo_formato_chk";

-- Se aplica como NOT VALID para no romper datos historicos preexistentes.
-- Los nuevos INSERT/UPDATE quedaran validados con este formato.
ALTER TABLE "item_codigo_sie"
  ADD CONSTRAINT "item_codigo_sie_codigo_formato_chk"
  CHECK ("codigo" ~ '^([0-9]{8}|[A-Z]{3}[0-9]{2})$')
  NOT VALID;

COMMIT;
