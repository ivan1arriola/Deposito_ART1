CREATE TABLE IF NOT EXISTS "movimiento_destinatario_recinto" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "clase" VARCHAR(16) NOT NULL,
  "nombre" TEXT NOT NULL,
  CONSTRAINT "movimiento_destinatario_recinto_clase_chk" CHECK ("clase" IN ('INTERNO', 'EXTERNO')),
  CONSTRAINT "movimiento_destinatario_recinto_nombre_chk" CHECK (btrim("nombre") <> '')
);

CREATE INDEX IF NOT EXISTS "movimiento_destinatario_recinto_clase_idx"
  ON "movimiento_destinatario_recinto"("clase");

CREATE INDEX IF NOT EXISTS "movimiento_destinatario_recinto_nombre_idx"
  ON "movimiento_destinatario_recinto"("nombre");

CREATE OR REPLACE FUNCTION public.validate_movimiento_destinatario_recinto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  movimiento_tipo "tipo_movimiento";
  recinto_clase TEXT;
BEGIN
  SELECT "tipo" INTO movimiento_tipo
  FROM "movimiento"
  WHERE "movimiento_id" = NEW."movimiento_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe movimiento para el destinatario recinto %.', NEW."movimiento_id";
  END IF;

  IF movimiento_tipo NOT IN ('ENTREGA', 'DEVOLUCION') THEN
    RAISE EXCEPTION 'Solo las entregas y devoluciones pueden tener destinatario recinto. Movimiento % es %.', NEW."movimiento_id", movimiento_tipo;
  END IF;

  recinto_clase := upper(btrim(COALESCE(NEW."clase", '')));
  IF recinto_clase NOT IN ('INTERNO', 'EXTERNO') THEN
    RAISE EXCEPTION 'Clase de recinto inválida para movimiento %: %.', NEW."movimiento_id", COALESCE(NEW."clase", '<null>');
  END IF;

  NEW."clase" := recinto_clase;
  NEW."nombre" := btrim(COALESCE(NEW."nombre", ''));

  IF NEW."nombre" = '' THEN
    RAISE EXCEPTION 'El nombre del recinto es obligatorio para movimiento %.', NEW."movimiento_id";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "movimiento_destinatario_recinto_trg" ON "movimiento_destinatario_recinto";
CREATE TRIGGER "movimiento_destinatario_recinto_trg"
BEFORE INSERT OR UPDATE ON "movimiento_destinatario_recinto"
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatario_recinto();

CREATE OR REPLACE FUNCTION public.assert_movimiento_destinatarios(movimiento_id_input BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  movimiento_tipo "tipo_movimiento";
  afecta_stock_valor BOOLEAN;
  in_personal BOOLEAN;
  in_externo BOOLEAN;
  in_recinto BOOLEAN;
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
    EXISTS(SELECT 1 FROM "movimiento_destinatario_externo" WHERE "movimiento_id" = movimiento_id_input),
    EXISTS(SELECT 1 FROM "movimiento_destinatario_recinto" WHERE "movimiento_id" = movimiento_id_input)
  INTO in_personal, in_externo, in_recinto;

  total := (CASE WHEN in_personal THEN 1 ELSE 0 END)
    + (CASE WHEN in_externo THEN 1 ELSE 0 END)
    + (CASE WHEN in_recinto THEN 1 ELSE 0 END);

  IF movimiento_tipo IN ('ENTREGA', 'DEVOLUCION') THEN
    IF total <> 1 OR in_externo OR (NOT in_personal AND NOT in_recinto) THEN
      RAISE EXCEPTION 'El movimiento % de tipo % debe tener exactamente un destinatario de personal o recinto.', movimiento_id_input, movimiento_tipo;
    END IF;
    RETURN;
  END IF;

  IF movimiento_tipo = 'PRESTAMO' AND (in_recinto OR total > 1) THEN
    RAISE EXCEPTION 'El préstamo % no puede combinar destinatarios incompatibles.', movimiento_id_input;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS "movimiento_destinatarios_recinto_chk" ON "movimiento_destinatario_recinto";
CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_recinto_chk"
AFTER INSERT OR UPDATE OR DELETE ON "movimiento_destinatario_recinto"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();
