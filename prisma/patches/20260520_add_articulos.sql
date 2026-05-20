BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'tipo_articulo'
  ) THEN
    CREATE TYPE "tipo_articulo" AS ENUM ('OFICINA', 'LIMPIEZA');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "articulo" (
  "articulo_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "tipo" "tipo_articulo" NOT NULL
);

CREATE INDEX IF NOT EXISTS "articulo_tipo_idx" ON "articulo" ("tipo");

COMMIT;
