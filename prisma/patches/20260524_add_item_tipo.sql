DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'tipo_item'
  ) THEN
    CREATE TYPE "tipo_item" AS ENUM ('GENERAL', 'FRI');
  END IF;
END $$;

ALTER TABLE "item"
ADD COLUMN IF NOT EXISTS "tipo" "tipo_item" NOT NULL DEFAULT 'GENERAL';
