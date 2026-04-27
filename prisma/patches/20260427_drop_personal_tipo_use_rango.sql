BEGIN;

DO $$
DECLARE
  has_tipo BOOLEAN;
  mismatch_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'personal'
      AND column_name = 'tipo'
  ) INTO has_tipo;

  IF has_tipo THEN
    SELECT COUNT(*) INTO mismatch_count
    FROM "personal" p
    JOIN "grado" g ON g."grado_id" = p."grado_id"
    WHERE p."tipo" IS DISTINCT FROM g."tipo";

    IF mismatch_count > 0 THEN
      RAISE EXCEPTION 'No se puede eliminar personal.tipo: hay % registro(s) con tipo distinto al tipo del grado.', mismatch_count;
    END IF;
  END IF;
END
$$;

ALTER TABLE "personal"
DROP CONSTRAINT IF EXISTS "personal_grado_tipo_fk";

ALTER TABLE "personal"
DROP CONSTRAINT IF EXISTS "personal_grado_fk";

ALTER TABLE "personal"
ADD CONSTRAINT "personal_grado_fk"
FOREIGN KEY ("grado_id") REFERENCES "grado"("grado_id");

DROP INDEX IF EXISTS "personal_tipo_idx";
DROP INDEX IF EXISTS "personal_grado_id_tipo_idx";
CREATE INDEX IF NOT EXISTS "personal_grado_id_idx" ON "personal"("grado_id");

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

  SELECT g."tipo" INTO actual_tipo
  FROM "personal" p
  JOIN "grado" g ON g."grado_id" = p."grado_id"
  WHERE p."ci" = NEW."ci";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe personal para la CI %.', NEW."ci";
  END IF;

  IF actual_tipo <> expected_tipo THEN
    RAISE EXCEPTION 'La CI % es tipo %, no %.', NEW."ci", actual_tipo, expected_tipo;
  END IF;

  RETURN NEW;
END;
$$;

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
  SELECT g."tipo" INTO personal_tipo
  FROM "personal" p
  JOIN "grado" g ON g."grado_id" = p."grado_id"
  WHERE p."ci" = ci_text;

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

DROP TRIGGER IF EXISTS "personal_partition_personal_chk" ON "personal";

CREATE CONSTRAINT TRIGGER "personal_partition_personal_chk"
AFTER INSERT OR UPDATE OF "grado_id" ON "personal"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.validate_personal_partition_trigger();

CREATE OR REPLACE FUNCTION public.validate_movimiento_tipo_personal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  destino_tipo "tipo_personal";
BEGIN
  SELECT g."tipo" INTO destino_tipo
  FROM "personal" p
  JOIN "grado" g ON g."grado_id" = p."grado_id"
  WHERE p."ci" = NEW."personal_ci";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe personal para la CI %.', NEW."personal_ci";
  END IF;

  IF NEW."tipo" IN ('ENTREGA', 'DEVOLUCION') AND destino_tipo <> 'SUBALTERNO' THEN
    RAISE EXCEPTION 'Las % solo aplican a subalternos. CI % es tipo %.', NEW."tipo", NEW."personal_ci", destino_tipo;
  END IF;

  IF NEW."afecta_stock" <> TRUE THEN
    RAISE EXCEPTION 'Todos los movimientos deben afectar stock.';
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE "personal"
DROP COLUMN IF EXISTS "tipo";

COMMIT;
