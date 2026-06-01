DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tipo_equipo'
  ) THEN
    CREATE TABLE "tipo_equipo" (
      "tipo_equipo_id" SMALLSERIAL PRIMARY KEY,
      "clave" TEXT NOT NULL UNIQUE,
      "nombre" TEXT NOT NULL UNIQUE,
      "orden" SMALLINT NOT NULL
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "tipo_equipo_orden_idx" ON "tipo_equipo"("orden");

INSERT INTO "tipo_equipo" ("clave", "nombre", "orden")
VALUES ('FRI', 'F.R.I', 1)
ON CONFLICT ("clave") DO UPDATE
SET "nombre" = EXCLUDED."nombre";

ALTER TABLE "equipo"
ADD COLUMN IF NOT EXISTS "tipo_equipo_id" SMALLINT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipo' AND column_name = 'tipo'
  ) THEN
    UPDATE "equipo"
    SET "tipo_equipo_id" = (
      SELECT "tipo_equipo_id"
      FROM "tipo_equipo"
      WHERE "clave" = 'FRI'
    )
    WHERE "tipo"::text = 'FRI' AND "tipo_equipo_id" IS NULL;

    ALTER TABLE "equipo" DROP COLUMN "tipo";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'tipo_equipo'
  ) THEN
    DROP TYPE "tipo_equipo";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'equipo'
      AND constraint_name = 'item_tipo_equipo_id_fkey'
  ) THEN
    ALTER TABLE "equipo"
    ADD CONSTRAINT "item_tipo_equipo_id_fkey"
    FOREIGN KEY ("tipo_equipo_id") REFERENCES "tipo_equipo"("tipo_equipo_id")
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "item_tipo_equipo_id_idx" ON "equipo"("tipo_equipo_id");
