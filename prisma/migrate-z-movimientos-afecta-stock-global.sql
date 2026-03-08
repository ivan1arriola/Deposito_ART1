UPDATE "movimiento"
SET "afecta_stock" = TRUE
WHERE "afecta_stock" <> TRUE;

ALTER TABLE "movimiento"
  ALTER COLUMN "afecta_stock" SET DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimiento_prestamo_afecta_stock_chk'
  ) THEN
    ALTER TABLE "movimiento"
      DROP CONSTRAINT "movimiento_prestamo_afecta_stock_chk";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'movimiento_afecta_stock_true_chk'
  ) THEN
    ALTER TABLE "movimiento"
      ADD CONSTRAINT "movimiento_afecta_stock_true_chk"
      CHECK ("afecta_stock" = TRUE);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_movimiento_tipo_personal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  destino_tipo "tipo_personal";
BEGIN
  SELECT "tipo" INTO destino_tipo
  FROM "personal"
  WHERE "ci" = NEW."personal_ci";

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
