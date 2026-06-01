DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'tipo_equipo'
  ) THEN
    CREATE TYPE "tipo_equipo" AS ENUM ('GENERAL', 'FRI');
  END IF;
END $$;

ALTER TABLE "equipo"
ADD COLUMN IF NOT EXISTS "tipo" "tipo_equipo" NOT NULL DEFAULT 'GENERAL';
