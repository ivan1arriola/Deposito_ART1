ALTER TABLE IF EXISTS "item" RENAME TO "equipos";
ALTER TABLE IF EXISTS "item_codigo_sie" RENAME TO "equipo_codigo_sie";
ALTER TABLE IF EXISTS "caja_item" RENAME TO "caja_equipo";
ALTER TABLE IF EXISTS "caja_item_codigo_sie" RENAME TO "caja_equipo_codigo_sie";
ALTER TABLE IF EXISTS "movimiento_item" RENAME TO "movimiento_equipo";
ALTER TABLE IF EXISTS "stock_operacion_item" RENAME TO "stock_operacion_equipo";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipos' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE "equipos" RENAME COLUMN "item_id" TO "equipo_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipo_codigo_sie' AND column_name = 'item_codigo_sie_id'
  ) THEN
    ALTER TABLE "equipo_codigo_sie" RENAME COLUMN "item_codigo_sie_id" TO "equipo_codigo_sie_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipo_codigo_sie' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE "equipo_codigo_sie" RENAME COLUMN "item_id" TO "equipo_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'caja_equipo' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE "caja_equipo" RENAME COLUMN "item_id" TO "equipo_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'caja_equipo_codigo_sie' AND column_name = 'item_codigo_sie_id'
  ) THEN
    ALTER TABLE "caja_equipo_codigo_sie" RENAME COLUMN "item_codigo_sie_id" TO "equipo_codigo_sie_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'movimiento_equipo' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE "movimiento_equipo" RENAME COLUMN "item_id" TO "equipo_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_operacion_equipo' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE "stock_operacion_equipo" RENAME COLUMN "item_id" TO "equipo_id";
  END IF;
END $$;
