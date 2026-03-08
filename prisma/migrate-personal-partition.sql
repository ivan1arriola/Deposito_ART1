DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_personal') THEN
    CREATE TYPE "tipo_personal" AS ENUM ('SUBALTERNO', 'OFICIAL', 'SUBOFICIAL');
  END IF;
END $$;

ALTER TABLE "grado"
  ADD COLUMN IF NOT EXISTS "tipo" "tipo_personal";

UPDATE "grado"
SET "tipo" = 'SUBALTERNO'
WHERE "tipo" IS NULL;

ALTER TABLE "grado"
  ALTER COLUMN "tipo" SET NOT NULL;

ALTER TABLE "grado" DROP CONSTRAINT IF EXISTS "grado_abreviacion_key";
ALTER TABLE "grado" DROP CONSTRAINT IF EXISTS "grado_nombre_completo_key";

CREATE UNIQUE INDEX IF NOT EXISTS "grado_tipo_abreviacion_uq" ON "grado"("tipo", "abreviacion");
CREATE UNIQUE INDEX IF NOT EXISTS "grado_tipo_nombre_completo_uq" ON "grado"("tipo", "nombre_completo");
CREATE UNIQUE INDEX IF NOT EXISTS "grado_id_tipo_uq" ON "grado"("grado_id", "tipo");
CREATE INDEX IF NOT EXISTS "grado_tipo_orden_idx" ON "grado"("tipo", "orden");

ALTER TABLE "personal"
  ADD COLUMN IF NOT EXISTS "tipo" "tipo_personal";

UPDATE "personal"
SET "tipo" = 'SUBALTERNO'
WHERE "tipo" IS NULL;

ALTER TABLE "personal"
  ALTER COLUMN "tipo" SET NOT NULL;

ALTER TABLE "personal" DROP CONSTRAINT IF EXISTS "personal_grado_id_fkey";

ALTER TABLE "personal"
  ADD CONSTRAINT "personal_grado_tipo_fk"
  FOREIGN KEY ("grado_id", "tipo") REFERENCES "grado"("grado_id", "tipo");

CREATE INDEX IF NOT EXISTS "personal_tipo_idx" ON "personal"("tipo");
CREATE INDEX IF NOT EXISTS "personal_grado_id_tipo_idx" ON "personal"("grado_id", "tipo");

CREATE TABLE IF NOT EXISTS "subalterno" (
  "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
  "es_reingreso" BOOLEAN NOT NULL DEFAULT FALSE,
  "fecha_ingreso" DATE,
  "fecha_ingreso_original" DATE,
  "bateria_id" SMALLINT REFERENCES "bateria"("bateria_id"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "oficial" (
  "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "suboficial" (
  "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "subalterno_bateria_id_idx" ON "subalterno"("bateria_id");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'personal'
      AND column_name = 'es_reingreso'
  ) THEN
    INSERT INTO "subalterno" (
      "ci",
      "es_reingreso",
      "fecha_ingreso",
      "fecha_ingreso_original",
      "bateria_id",
      "created_at",
      "updated_at"
    )
    SELECT
      p."ci",
      COALESCE(p."es_reingreso", FALSE),
      p."fecha_ingreso",
      p."fecha_ingreso_original",
      p."bateria_id",
      p."created_at",
      p."updated_at"
    FROM "personal" p
    LEFT JOIN "subalterno" s ON s."ci" = p."ci"
    WHERE s."ci" IS NULL;
  ELSE
    INSERT INTO "subalterno" ("ci")
    SELECT p."ci"
    FROM "personal" p
    LEFT JOIN "subalterno" s ON s."ci" = p."ci"
    WHERE s."ci" IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'oficial_suboficial'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'grado_mando'
  ) THEN
    INSERT INTO "grado" ("tipo", "abreviacion", "nombre_completo", "orden")
    SELECT DISTINCT
      CASE os."tipo"
        WHEN 'OFICIAL' THEN 'OFICIAL'::"tipo_personal"
        ELSE 'SUBOFICIAL'::"tipo_personal"
      END,
      gm."abreviacion",
      gm."nombre_completo",
      gm."orden"
    FROM "oficial_suboficial" os
    INNER JOIN "grado_mando" gm ON gm."grado_mando_id" = os."grado_mando_id"
    ON CONFLICT ("tipo", "abreviacion") DO UPDATE
    SET
      "nombre_completo" = EXCLUDED."nombre_completo",
      "orden" = EXCLUDED."orden";

    INSERT INTO "personal" (
      "ci",
      "tipo",
      "apellido1",
      "apellido2",
      "nombre1",
      "nombre2",
      "telefono_contacto",
      "grado_id",
      "created_at",
      "updated_at"
    )
    SELECT
      os."ci",
      CASE os."tipo"
        WHEN 'OFICIAL' THEN 'OFICIAL'::"tipo_personal"
        ELSE 'SUBOFICIAL'::"tipo_personal"
      END,
      os."apellido",
      NULL,
      os."nombre",
      NULL,
      NULL,
      g."grado_id",
      os."created_at",
      os."updated_at"
    FROM "oficial_suboficial" os
    INNER JOIN "grado_mando" gm ON gm."grado_mando_id" = os."grado_mando_id"
    INNER JOIN "grado" g
      ON g."tipo" = CASE os."tipo"
        WHEN 'OFICIAL' THEN 'OFICIAL'::"tipo_personal"
        ELSE 'SUBOFICIAL'::"tipo_personal"
      END
      AND g."abreviacion" = gm."abreviacion"
    ON CONFLICT ("ci") DO NOTHING;

    INSERT INTO "oficial" ("ci", "created_at", "updated_at")
    SELECT p."ci", p."created_at", p."updated_at"
    FROM "personal" p
    LEFT JOIN "oficial" o ON o."ci" = p."ci"
    WHERE p."tipo" = 'OFICIAL'
      AND o."ci" IS NULL;

    INSERT INTO "suboficial" ("ci", "created_at", "updated_at")
    SELECT p."ci", p."created_at", p."updated_at"
    FROM "personal" p
    LEFT JOIN "suboficial" s ON s."ci" = p."ci"
    WHERE p."tipo" = 'SUBOFICIAL'
      AND s."ci" IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'oficial_suboficial_talla'
  ) THEN
    INSERT INTO "personal_talla" ("ci", "talla_tipo_id", "talla_valor", "updated_at")
    SELECT
      ost."ci",
      ost."talla_tipo_id",
      ost."talla_valor",
      ost."updated_at"
    FROM "oficial_suboficial_talla" ost
    ON CONFLICT ("ci", "talla_tipo_id") DO UPDATE
    SET
      "talla_valor" = EXCLUDED."talla_valor",
      "updated_at" = EXCLUDED."updated_at";
  END IF;
END $$;

ALTER TABLE "prestamo" DROP CONSTRAINT IF EXISTS "prestamo_destinatario_personal_ci_fkey";
ALTER TABLE "prestamo" DROP CONSTRAINT IF EXISTS "prestamo_destinatario_oficial_suboficial_ci_fkey";

ALTER TABLE "prestamo"
  ADD CONSTRAINT "prestamo_destinatario_personal_ci_fkey"
  FOREIGN KEY ("destinatario_personal_ci") REFERENCES "personal"("ci");

ALTER TABLE "prestamo"
  ADD CONSTRAINT "prestamo_destinatario_oficial_suboficial_ci_fkey"
  FOREIGN KEY ("destinatario_oficial_suboficial_ci") REFERENCES "personal"("ci");

CREATE OR REPLACE FUNCTION public.validate_prestamo_destinatario_tipo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  destino_tipo "tipo_personal";
BEGIN
  IF NEW."destinatario_tipo" = 'PERSONAL' THEN
    SELECT "tipo" INTO destino_tipo
    FROM "personal"
    WHERE "ci" = NEW."destinatario_personal_ci";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No existe personal para la CI %.', NEW."destinatario_personal_ci";
    END IF;

    IF destino_tipo <> 'SUBALTERNO' THEN
      RAISE EXCEPTION 'La CI % no pertenece a personal subalterno.', NEW."destinatario_personal_ci";
    END IF;

    RETURN NEW;
  END IF;

  SELECT "tipo" INTO destino_tipo
  FROM "personal"
  WHERE "ci" = NEW."destinatario_oficial_suboficial_ci";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe personal para la CI %.', NEW."destinatario_oficial_suboficial_ci";
  END IF;

  IF destino_tipo NOT IN ('OFICIAL', 'SUBOFICIAL') THEN
    RAISE EXCEPTION 'La CI % no pertenece a oficial/suboficial.', NEW."destinatario_oficial_suboficial_ci";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "prestamo_destinatario_tipo_trg" ON "prestamo";

CREATE TRIGGER "prestamo_destinatario_tipo_trg"
BEFORE INSERT OR UPDATE ON "prestamo"
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_destinatario_tipo();

ALTER TABLE "subalterno" DROP CONSTRAINT IF EXISTS "subalterno_fecha_ingreso_hoy_chk";
ALTER TABLE "subalterno" DROP CONSTRAINT IF EXISTS "subalterno_fecha_ingreso_original_hoy_chk";
ALTER TABLE "subalterno" DROP CONSTRAINT IF EXISTS "subalterno_reingreso_chk";

ALTER TABLE "subalterno"
  ADD CONSTRAINT "subalterno_fecha_ingreso_hoy_chk"
  CHECK ("fecha_ingreso" IS NULL OR "fecha_ingreso" <= CURRENT_DATE);

ALTER TABLE "subalterno"
  ADD CONSTRAINT "subalterno_fecha_ingreso_original_hoy_chk"
  CHECK ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= CURRENT_DATE);

ALTER TABLE "subalterno"
  ADD CONSTRAINT "subalterno_reingreso_chk"
  CHECK (
    ("es_reingreso" = FALSE AND "fecha_ingreso_original" IS NULL)
    OR (
      "es_reingreso" = TRUE
      AND "fecha_ingreso" IS NOT NULL
      AND ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= "fecha_ingreso")
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_subtable_tipo_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  expected_tipo "tipo_personal";
  actual_tipo "tipo_personal";
BEGIN
  IF TG_TABLE_NAME = 'subalterno' THEN
    expected_tipo := 'SUBALTERNO';
  ELSIF TG_TABLE_NAME = 'oficial' THEN
    expected_tipo := 'OFICIAL';
  ELSE
    expected_tipo := 'SUBOFICIAL';
  END IF;

  SELECT "tipo" INTO actual_tipo
  FROM "personal"
  WHERE "ci" = NEW."ci";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe personal para la CI %.', NEW."ci";
  END IF;

  IF actual_tipo <> expected_tipo THEN
    RAISE EXCEPTION 'La CI % es tipo %, no %.', NEW."ci", actual_tipo, expected_tipo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "subalterno_tipo_match_trg" ON "subalterno";
DROP TRIGGER IF EXISTS "oficial_tipo_match_trg" ON "oficial";
DROP TRIGGER IF EXISTS "suboficial_tipo_match_trg" ON "suboficial";

CREATE TRIGGER "subalterno_tipo_match_trg"
BEFORE INSERT OR UPDATE ON "subalterno"
FOR EACH ROW EXECUTE FUNCTION public.enforce_subtable_tipo_match();

CREATE TRIGGER "oficial_tipo_match_trg"
BEFORE INSERT OR UPDATE ON "oficial"
FOR EACH ROW EXECUTE FUNCTION public.enforce_subtable_tipo_match();

CREATE TRIGGER "suboficial_tipo_match_trg"
BEFORE INSERT OR UPDATE ON "suboficial"
FOR EACH ROW EXECUTE FUNCTION public.enforce_subtable_tipo_match();

CREATE OR REPLACE FUNCTION public.assert_personal_partition(ci_text TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  personal_tipo "tipo_personal";
  in_subalterno BOOLEAN;
  in_oficial BOOLEAN;
  in_suboficial BOOLEAN;
  total INTEGER;
BEGIN
  SELECT "tipo" INTO personal_tipo
  FROM "personal"
  WHERE "ci" = ci_text;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    EXISTS(SELECT 1 FROM "subalterno" WHERE "ci" = ci_text),
    EXISTS(SELECT 1 FROM "oficial" WHERE "ci" = ci_text),
    EXISTS(SELECT 1 FROM "suboficial" WHERE "ci" = ci_text)
  INTO in_subalterno, in_oficial, in_suboficial;

  total :=
    (CASE WHEN in_subalterno THEN 1 ELSE 0 END) +
    (CASE WHEN in_oficial THEN 1 ELSE 0 END) +
    (CASE WHEN in_suboficial THEN 1 ELSE 0 END);

  IF total <> 1 THEN
    RAISE EXCEPTION 'La CI % debe estar en exactamente una subtabla. Actual: %.', ci_text, total;
  END IF;

  IF (personal_tipo = 'SUBALTERNO' AND NOT in_subalterno)
    OR (personal_tipo = 'OFICIAL' AND NOT in_oficial)
    OR (personal_tipo = 'SUBOFICIAL' AND NOT in_suboficial) THEN
    RAISE EXCEPTION 'La CI % tiene tipo % pero no coincide con su subtabla.', ci_text, personal_tipo;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_personal_partition_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assert_personal_partition(COALESCE(NEW."ci", OLD."ci"));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "personal_partition_personal_chk" ON "personal";
DROP TRIGGER IF EXISTS "personal_partition_subalterno_chk" ON "subalterno";
DROP TRIGGER IF EXISTS "personal_partition_oficial_chk" ON "oficial";
DROP TRIGGER IF EXISTS "personal_partition_suboficial_chk" ON "suboficial";

CREATE CONSTRAINT TRIGGER "personal_partition_personal_chk"
AFTER INSERT OR UPDATE OF "tipo" ON "personal"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.validate_personal_partition_trigger();

CREATE CONSTRAINT TRIGGER "personal_partition_subalterno_chk"
AFTER INSERT OR DELETE ON "subalterno"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.validate_personal_partition_trigger();

CREATE CONSTRAINT TRIGGER "personal_partition_oficial_chk"
AFTER INSERT OR DELETE ON "oficial"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.validate_personal_partition_trigger();

CREATE CONSTRAINT TRIGGER "personal_partition_suboficial_chk"
AFTER INSERT OR DELETE ON "suboficial"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.validate_personal_partition_trigger();

ALTER TABLE "personal" DROP CONSTRAINT IF EXISTS "personal_fecha_ingreso_hoy_chk";
ALTER TABLE "personal" DROP CONSTRAINT IF EXISTS "personal_fecha_ingreso_original_hoy_chk";
ALTER TABLE "personal" DROP CONSTRAINT IF EXISTS "personal_reingreso_chk";

ALTER TABLE "personal" DROP COLUMN IF EXISTS "es_reingreso";
ALTER TABLE "personal" DROP COLUMN IF EXISTS "fecha_ingreso";
ALTER TABLE "personal" DROP COLUMN IF EXISTS "fecha_ingreso_original";
ALTER TABLE "personal" DROP COLUMN IF EXISTS "bateria_id";

DROP INDEX IF EXISTS "personal_bateria_id_idx";

DROP TABLE IF EXISTS "oficial_suboficial_talla";
DROP TABLE IF EXISTS "oficial_suboficial";
DROP TABLE IF EXISTS "grado_mando";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_oficial_suboficial') THEN
    DROP TYPE "tipo_oficial_suboficial";
  END IF;
END $$;
