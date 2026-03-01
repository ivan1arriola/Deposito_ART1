ALTER TABLE "personal"
  ADD COLUMN IF NOT EXISTS "es_reingreso" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "fecha_ingreso_original" DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personal_fecha_ingreso_original_hoy_chk'
  ) THEN
    ALTER TABLE "personal"
      ADD CONSTRAINT "personal_fecha_ingreso_original_hoy_chk"
      CHECK ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= CURRENT_DATE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'personal_reingreso_chk'
  ) THEN
    ALTER TABLE "personal"
      ADD CONSTRAINT "personal_reingreso_chk"
      CHECK (
        ("es_reingreso" = FALSE AND "fecha_ingreso_original" IS NULL)
        OR (
          "es_reingreso" = TRUE
          AND "fecha_ingreso" IS NOT NULL
          AND ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= "fecha_ingreso")
        )
      );
  END IF;
END $$;
