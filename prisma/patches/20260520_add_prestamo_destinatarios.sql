CREATE TABLE IF NOT EXISTS "persona_externa" (
  "ci" TEXT PRIMARY KEY,
  "grado" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "apellido" TEXT NOT NULL,
  "unidad_destino" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "persona_externa_ci_uruguaya_valida_chk" CHECK (public.es_ci_uruguaya_valida("ci"))
);

CREATE INDEX IF NOT EXISTS "persona_externa_apellido_nombre_idx"
  ON "persona_externa"("apellido", "nombre");

CREATE TABLE IF NOT EXISTS "movimiento_destinatario_personal" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "ci" TEXT NOT NULL REFERENCES "personal"("ci")
);

CREATE INDEX IF NOT EXISTS "movimiento_destinatario_personal_ci_idx"
  ON "movimiento_destinatario_personal"("ci");

CREATE TABLE IF NOT EXISTS "movimiento_destinatario_externo" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "persona_externa_ci" TEXT NOT NULL REFERENCES "persona_externa"("ci")
);

CREATE INDEX IF NOT EXISTS "movimiento_destinatario_externo_persona_externa_ci_idx"
  ON "movimiento_destinatario_externo"("persona_externa_ci");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'movimiento'
      AND column_name = 'personal_ci'
  ) THEN
    INSERT INTO "movimiento_destinatario_personal" ("movimiento_id", "ci")
    SELECT "movimiento_id", "personal_ci"
    FROM "movimiento"
    ON CONFLICT ("movimiento_id") DO NOTHING;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS "movimiento_tipo_personal_trg" ON "movimiento";
DROP FUNCTION IF EXISTS public.validate_movimiento_tipo_personal();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'movimiento'
      AND column_name = 'personal_ci'
  ) THEN
    DROP INDEX IF EXISTS "movimiento_personal_ci_fecha_idx";
    ALTER TABLE "movimiento" DROP COLUMN "personal_ci";
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_movimiento_destinatario_personal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  movimiento_tipo "tipo_movimiento";
  destino_tipo "tipo_personal";
BEGIN
  SELECT m."tipo", g."tipo"
  INTO movimiento_tipo, destino_tipo
  FROM "movimiento" m
  JOIN "personal" p ON p."ci" = NEW."ci"
  JOIN "grado" g ON g."grado_id" = p."grado_id"
  WHERE m."movimiento_id" = NEW."movimiento_id";

  IF NOT FOUND THEN
    IF NOT EXISTS(SELECT 1 FROM "movimiento" WHERE "movimiento_id" = NEW."movimiento_id") THEN
      RAISE EXCEPTION 'No existe movimiento para el destinatario %.', NEW."movimiento_id";
    END IF;
    RAISE EXCEPTION 'No existe personal para la CI %.', NEW."ci";
  END IF;

  IF movimiento_tipo IN ('ENTREGA', 'DEVOLUCION') AND destino_tipo <> 'SUBALTERNO' THEN
    RAISE EXCEPTION 'Las % solo aplican a subalternos. CI % es tipo %.', movimiento_tipo, NEW."ci", destino_tipo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "movimiento_destinatario_personal_trg" ON "movimiento_destinatario_personal";
CREATE TRIGGER "movimiento_destinatario_personal_trg"
BEFORE INSERT OR UPDATE ON "movimiento_destinatario_personal"
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatario_personal();

CREATE OR REPLACE FUNCTION public.validate_movimiento_destinatario_externo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  movimiento_tipo "tipo_movimiento";
BEGIN
  SELECT "tipo" INTO movimiento_tipo
  FROM "movimiento"
  WHERE "movimiento_id" = NEW."movimiento_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe movimiento para el destinatario externo %.', NEW."movimiento_id";
  END IF;

  IF movimiento_tipo <> 'PRESTAMO' THEN
    RAISE EXCEPTION 'Solo los préstamos pueden tener destinatario externo. Movimiento % es %.', NEW."movimiento_id", movimiento_tipo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "movimiento_destinatario_externo_trg" ON "movimiento_destinatario_externo";
CREATE TRIGGER "movimiento_destinatario_externo_trg"
BEFORE INSERT OR UPDATE ON "movimiento_destinatario_externo"
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatario_externo();

CREATE OR REPLACE FUNCTION public.assert_movimiento_destinatarios(movimiento_id_input BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  movimiento_tipo "tipo_movimiento";
  afecta_stock_valor BOOLEAN;
  in_personal BOOLEAN;
  in_externo BOOLEAN;
  total INTEGER;
BEGIN
  SELECT "tipo", "afecta_stock"
  INTO movimiento_tipo, afecta_stock_valor
  FROM "movimiento"
  WHERE "movimiento_id" = movimiento_id_input;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF afecta_stock_valor <> TRUE THEN
    RAISE EXCEPTION 'Todos los movimientos deben afectar stock.';
  END IF;

  SELECT
    EXISTS(SELECT 1 FROM "movimiento_destinatario_personal" WHERE "movimiento_id" = movimiento_id_input),
    EXISTS(SELECT 1 FROM "movimiento_destinatario_externo" WHERE "movimiento_id" = movimiento_id_input)
  INTO in_personal, in_externo;

  total := (CASE WHEN in_personal THEN 1 ELSE 0 END) + (CASE WHEN in_externo THEN 1 ELSE 0 END);

  IF movimiento_tipo IN ('ENTREGA', 'DEVOLUCION') THEN
    IF total <> 1 OR NOT in_personal OR in_externo THEN
      RAISE EXCEPTION 'El movimiento % de tipo % debe tener exactamente un destinatario interno.', movimiento_id_input, movimiento_tipo;
    END IF;
    RETURN;
  END IF;

  IF movimiento_tipo = 'PRESTAMO' AND total > 1 THEN
    RAISE EXCEPTION 'El préstamo % no puede tener destinatario interno y externo al mismo tiempo.', movimiento_id_input;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_movimiento_destinatarios_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assert_movimiento_destinatarios(COALESCE(NEW."movimiento_id", OLD."movimiento_id"));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "movimiento_destinatarios_movimiento_chk" ON "movimiento";
CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_movimiento_chk"
AFTER INSERT OR UPDATE OF "tipo", "afecta_stock" ON "movimiento"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();

DROP TRIGGER IF EXISTS "movimiento_destinatarios_personal_chk" ON "movimiento_destinatario_personal";
CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_personal_chk"
AFTER INSERT OR UPDATE OR DELETE ON "movimiento_destinatario_personal"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();

DROP TRIGGER IF EXISTS "movimiento_destinatarios_externo_chk" ON "movimiento_destinatario_externo";
CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_externo_chk"
AFTER INSERT OR UPDATE OR DELETE ON "movimiento_destinatario_externo"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();
