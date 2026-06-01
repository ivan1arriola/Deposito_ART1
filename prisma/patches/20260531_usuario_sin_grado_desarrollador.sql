DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'DESARROLLADOR'
  ) THEN
    ALTER TYPE "user_role" ADD VALUE 'DESARROLLADOR';
  END IF;
END $$;

ALTER TABLE "usuario"
ALTER COLUMN "grado_id" DROP NOT NULL;

DO $$
DECLARE
  desarrollo_grado_id SMALLINT;
  personal_refs INTEGER;
BEGIN
  SELECT "grado_id"
  INTO desarrollo_grado_id
  FROM "grado"
  WHERE "abreviacion" = 'Desarrollo' AND "nombre_completo" = 'Desarrollo'
  ORDER BY "grado_id"
  LIMIT 1;

  IF desarrollo_grado_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE "usuario"
  SET "rol" = 'DESARROLLADOR'
  WHERE "grado_id" = desarrollo_grado_id;

  UPDATE "usuario"
  SET "grado_id" = NULL
  WHERE "grado_id" = desarrollo_grado_id;

  SELECT COUNT(*)
  INTO personal_refs
  FROM "personal"
  WHERE "grado_id" = desarrollo_grado_id;

  IF personal_refs > 0 THEN
    RAISE EXCEPTION
      'Hay % registro(s) en personal usando el grado Desarrollo. Corrige esos grados antes de eliminarlo del catalogo.',
      personal_refs;
  END IF;

  DELETE FROM "grado"
  WHERE "grado_id" = desarrollo_grado_id;
END $$;
