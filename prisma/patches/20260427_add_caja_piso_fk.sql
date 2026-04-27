BEGIN;

ALTER TABLE "caja"
ADD COLUMN IF NOT EXISTS "piso" SMALLINT;

WITH piso_por_codigo AS (
  SELECT "codigo", MIN("piso") AS "piso"
  FROM "estanteria"
  GROUP BY "codigo"
)
UPDATE "caja" AS c
SET "piso" = p."piso"
FROM piso_por_codigo AS p
WHERE c."piso" IS NULL
  AND c."estanteria" = p."codigo";

DO $$
DECLARE
  unresolved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unresolved_count
  FROM "caja"
  WHERE "piso" IS NULL;

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'No se pudo inferir piso para % caja(s). Completa "caja.piso" manualmente y vuelve a ejecutar el patch.',
      unresolved_count;
  END IF;
END
$$;

ALTER TABLE "caja"
ALTER COLUMN "piso" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'caja_piso_rango_chk'
      AND conrelid = 'caja'::regclass
  ) THEN
    ALTER TABLE "caja"
    ADD CONSTRAINT "caja_piso_rango_chk" CHECK ("piso" >= 1 AND "piso" <= 2);
  END IF;
END
$$;

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'caja'::regclass
      AND contype = 'f'
      AND confrelid = 'estanteria'::regclass
  LOOP
    EXECUTE format('ALTER TABLE "caja" DROP CONSTRAINT %I', fk.conname);
  END LOOP;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'caja_estanteria_fk'
      AND conrelid = 'caja'::regclass
  ) THEN
    ALTER TABLE "caja"
    ADD CONSTRAINT "caja_estanteria_fk"
    FOREIGN KEY ("estanteria", "piso")
    REFERENCES "estanteria"("codigo", "piso")
    ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "caja_estanteria_piso_idx"
ON "caja" ("estanteria", "piso");

COMMIT;
