ALTER TABLE IF EXISTS "equipo" RENAME TO "equipos";
ALTER TABLE IF EXISTS "equipo_codigo_sie" RENAME TO "equipo_codigo_sie";
ALTER TABLE IF EXISTS "caja_equipo" RENAME TO "caja_equipo";
ALTER TABLE IF EXISTS "caja_equipo_codigo_sie" RENAME TO "caja_equipo_codigo_sie";
ALTER TABLE IF EXISTS "movimiento_equipo" RENAME TO "movimiento_equipo";
ALTER TABLE IF EXISTS "stock_operacion_equipo" RENAME TO "stock_operacion_equipo";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipos' AND column_name = 'equipo_id'
  ) THEN
    ALTER TABLE "equipos" RENAME COLUMN "equipo_id" TO "equipo_id";
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
    WHERE table_schema = 'public' AND table_name = 'equipo_codigo_sie' AND column_name = 'equipo_id'
  ) THEN
    ALTER TABLE "equipo_codigo_sie" RENAME COLUMN "equipo_id" TO "equipo_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'caja_equipo' AND column_name = 'equipo_id'
  ) THEN
    ALTER TABLE "caja_equipo" RENAME COLUMN "equipo_id" TO "equipo_id";
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
    WHERE table_schema = 'public' AND table_name = 'movimiento_equipo' AND column_name = 'equipo_id'
  ) THEN
    ALTER TABLE "movimiento_equipo" RENAME COLUMN "equipo_id" TO "equipo_id";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_operacion_equipo' AND column_name = 'equipo_id'
  ) THEN
    ALTER TABLE "stock_operacion_equipo" RENAME COLUMN "equipo_id" TO "equipo_id";
  END IF;
END $$;
