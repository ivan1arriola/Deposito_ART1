ALTER TABLE "usuario"
  ADD COLUMN IF NOT EXISTS "grado_id" SMALLINT;

UPDATE "usuario" u
SET "grado_id" = g."grado_id"
FROM "grado" g
WHERE u."grado_id" IS NULL
  AND (
    lower(trim(u."grado")) = lower(trim(g."abreviacion"))
    OR lower(trim(u."grado")) = lower(trim(g."nombre_completo"))
  );

WITH fallback AS (
  SELECT "grado_id"
  FROM "grado"
  WHERE "tipo" = 'SUBALTERNO'
  ORDER BY "orden" ASC, "grado_id" ASC
  LIMIT 1
)
UPDATE "usuario" u
SET "grado_id" = fallback."grado_id"
FROM fallback
WHERE u."grado_id" IS NULL;

ALTER TABLE "usuario"
  ALTER COLUMN "grado_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'usuario_grado_id_fkey'
  ) THEN
    ALTER TABLE "usuario"
      ADD CONSTRAINT "usuario_grado_id_fkey"
      FOREIGN KEY ("grado_id") REFERENCES "grado"("grado_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "usuario_grado_id_idx" ON "usuario"("grado_id");

ALTER TABLE "usuario"
  DROP COLUMN IF EXISTS "grado";
