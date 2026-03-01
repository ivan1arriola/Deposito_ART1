BEGIN;

ALTER TABLE "usuario"
  RENAME COLUMN "username" TO "usuario";

ALTER TABLE "usuario"
  DROP COLUMN IF EXISTS "email";

ALTER TABLE "usuario"
  ADD COLUMN IF NOT EXISTS "grado" TEXT,
  ADD COLUMN IF NOT EXISTS "nombre" TEXT,
  ADD COLUMN IF NOT EXISTS "apellido" TEXT,
  ADD COLUMN IF NOT EXISTS "mail_referencia" TEXT;

UPDATE "usuario"
SET
  "grado" = COALESCE(NULLIF("grado", ''), 'S/D'),
  "nombre" = COALESCE(NULLIF("nombre", ''), initcap("usuario")),
  "apellido" = COALESCE(NULLIF("apellido", ''), 'S/D');

ALTER TABLE "usuario"
  ALTER COLUMN "grado" SET NOT NULL,
  ALTER COLUMN "nombre" SET NOT NULL,
  ALTER COLUMN "apellido" SET NOT NULL;

COMMIT;
