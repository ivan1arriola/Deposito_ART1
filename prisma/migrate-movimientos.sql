DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
    CREATE TYPE "tipo_movimiento" AS ENUM ('ENTREGA', 'DEVOLUCION', 'PRESTAMO');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_prestamo_movimiento') THEN
    CREATE TYPE "estado_prestamo_movimiento" AS ENUM ('PENDIENTE', 'DEVUELTO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "movimiento" (
  "movimiento_id" BIGSERIAL PRIMARY KEY,
  "tipo" "tipo_movimiento" NOT NULL,
  "fecha" DATE NOT NULL,
  "personal_ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "usuario_entrega_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id"),
  "afecta_stock" BOOLEAN NOT NULL DEFAULT TRUE,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

ALTER TABLE "movimiento"
  ADD COLUMN IF NOT EXISTS "tipo" "tipo_movimiento",
  ADD COLUMN IF NOT EXISTS "fecha" DATE,
  ADD COLUMN IF NOT EXISTS "personal_ci" TEXT,
  ADD COLUMN IF NOT EXISTS "usuario_entrega_id" TEXT,
  ADD COLUMN IF NOT EXISTS "afecta_stock" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "observaciones" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6);

ALTER TABLE "movimiento"
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now(),
  ALTER COLUMN "afecta_stock" SET DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_fecha_hoy_chk'
  ) THEN
    ALTER TABLE "movimiento"
      ADD CONSTRAINT "movimiento_fecha_hoy_chk"
      CHECK ("fecha" <= CURRENT_DATE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_prestamo_afecta_stock_chk'
  ) THEN
    ALTER TABLE "movimiento"
      ADD CONSTRAINT "movimiento_prestamo_afecta_stock_chk"
      CHECK ("tipo" <> 'PRESTAMO' OR "afecta_stock" = TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_personal_ci_fkey'
  ) THEN
    ALTER TABLE "movimiento"
      ADD CONSTRAINT "movimiento_personal_ci_fkey"
      FOREIGN KEY ("personal_ci") REFERENCES "personal"("ci") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimiento_usuario_entrega_id_fkey'
  ) THEN
    ALTER TABLE "movimiento"
      ADD CONSTRAINT "movimiento_usuario_entrega_id_fkey"
      FOREIGN KEY ("usuario_entrega_id") REFERENCES "usuario"("usuario_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "movimiento_personal_ci_fecha_idx" ON "movimiento"("personal_ci", "fecha" DESC);
CREATE INDEX IF NOT EXISTS "movimiento_tipo_fecha_idx" ON "movimiento"("tipo", "fecha" DESC);
CREATE INDEX IF NOT EXISTS "movimiento_usuario_entrega_id_fecha_idx" ON "movimiento"("usuario_entrega_id", "fecha" DESC);

CREATE TABLE IF NOT EXISTS "movimiento_item" (
  "movimiento_id" BIGINT NOT NULL REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "item_id" BIGINT NOT NULL REFERENCES "item"("item_id") ON DELETE CASCADE,
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("movimiento_id", "item_id")
);

CREATE INDEX IF NOT EXISTS "movimiento_item_item_id_idx" ON "movimiento_item"("item_id");

CREATE TABLE IF NOT EXISTS "prestamo_activo" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "recibo_numero" TEXT NOT NULL UNIQUE,
  "estado" "estado_prestamo_movimiento" NOT NULL DEFAULT 'PENDIENTE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

ALTER TABLE "prestamo_activo"
  ADD COLUMN IF NOT EXISTS "movimiento_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "recibo_numero" TEXT,
  ADD COLUMN IF NOT EXISTS "estado" "estado_prestamo_movimiento",
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6);

ALTER TABLE "prestamo_activo"
  ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE',
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_activo_estado_chk'
  ) THEN
    ALTER TABLE "prestamo_activo"
      ADD CONSTRAINT "prestamo_activo_estado_chk"
      CHECK ("estado" = 'PENDIENTE');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "prestamo_activo_estado_created_at_idx" ON "prestamo_activo"("estado", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "prestamo_historial" (
  "historial_id" BIGSERIAL PRIMARY KEY,
  "movimiento_id" BIGINT NOT NULL UNIQUE REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "recibo_numero" TEXT NOT NULL UNIQUE,
  "estado" "estado_prestamo_movimiento" NOT NULL DEFAULT 'DEVUELTO',
  "fecha_devolucion" DATE NOT NULL,
  "usuario_recibe_devolucion_id" TEXT REFERENCES "usuario"("usuario_id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

ALTER TABLE "prestamo_historial"
  ADD COLUMN IF NOT EXISTS "movimiento_id" BIGINT,
  ADD COLUMN IF NOT EXISTS "recibo_numero" TEXT,
  ADD COLUMN IF NOT EXISTS "estado" "estado_prestamo_movimiento",
  ADD COLUMN IF NOT EXISTS "fecha_devolucion" DATE,
  ADD COLUMN IF NOT EXISTS "usuario_recibe_devolucion_id" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6);

ALTER TABLE "prestamo_historial"
  ALTER COLUMN "estado" SET DEFAULT 'DEVUELTO',
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_historial_estado_chk'
  ) THEN
    ALTER TABLE "prestamo_historial"
      ADD CONSTRAINT "prestamo_historial_estado_chk"
      CHECK ("estado" = 'DEVUELTO');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_historial_fecha_hoy_chk'
  ) THEN
    ALTER TABLE "prestamo_historial"
      ADD CONSTRAINT "prestamo_historial_fecha_hoy_chk"
      CHECK ("fecha_devolucion" <= CURRENT_DATE);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "prestamo_historial_fecha_devolucion_idx" ON "prestamo_historial"("fecha_devolucion" DESC);
CREATE INDEX IF NOT EXISTS "prestamo_historial_usuario_recibe_fecha_idx" ON "prestamo_historial"("usuario_recibe_devolucion_id", "fecha_devolucion" DESC);

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

  IF NEW."tipo" = 'PRESTAMO' AND NEW."afecta_stock" <> TRUE THEN
    RAISE EXCEPTION 'Los prestamos siempre afectan stock.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "movimiento_tipo_personal_trg" ON "movimiento";
CREATE TRIGGER "movimiento_tipo_personal_trg"
BEFORE INSERT OR UPDATE ON "movimiento"
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_tipo_personal();

CREATE OR REPLACE FUNCTION public.validate_prestamo_child_tipo()
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
    RAISE EXCEPTION 'No existe movimiento para el prestamo %.', NEW."movimiento_id";
  END IF;

  IF movimiento_tipo <> 'PRESTAMO' THEN
    RAISE EXCEPTION 'El movimiento % no es de tipo PRESTAMO.', NEW."movimiento_id";
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "prestamo_activo_tipo_trg" ON "prestamo_activo";
CREATE TRIGGER "prestamo_activo_tipo_trg"
BEFORE INSERT OR UPDATE ON "prestamo_activo"
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_child_tipo();

DROP TRIGGER IF EXISTS "prestamo_historial_tipo_trg" ON "prestamo_historial";
CREATE TRIGGER "prestamo_historial_tipo_trg"
BEFORE INSERT OR UPDATE ON "prestamo_historial"
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_child_tipo();

CREATE OR REPLACE FUNCTION public.validate_prestamo_historial_fecha()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  fecha_prestamo DATE;
BEGIN
  SELECT "fecha" INTO fecha_prestamo
  FROM "movimiento"
  WHERE "movimiento_id" = NEW."movimiento_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe movimiento para el prestamo %.', NEW."movimiento_id";
  END IF;

  IF NEW."fecha_devolucion" < fecha_prestamo THEN
    RAISE EXCEPTION 'La fecha de devolucion (%) no puede ser anterior a la fecha de prestamo (%).', NEW."fecha_devolucion", fecha_prestamo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "prestamo_historial_fecha_trg" ON "prestamo_historial";
CREATE TRIGGER "prestamo_historial_fecha_trg"
BEFORE INSERT OR UPDATE ON "prestamo_historial"
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_historial_fecha();

CREATE OR REPLACE FUNCTION public.assert_prestamo_partition(movimiento_id_input BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  movimiento_tipo "tipo_movimiento";
  in_activo BOOLEAN;
  in_historial BOOLEAN;
  total INTEGER;
BEGIN
  SELECT "tipo" INTO movimiento_tipo
  FROM "movimiento"
  WHERE "movimiento_id" = movimiento_id_input;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    EXISTS(SELECT 1 FROM "prestamo_activo" WHERE "movimiento_id" = movimiento_id_input),
    EXISTS(SELECT 1 FROM "prestamo_historial" WHERE "movimiento_id" = movimiento_id_input)
  INTO in_activo, in_historial;

  IF movimiento_tipo <> 'PRESTAMO' THEN
    IF in_activo OR in_historial THEN
      RAISE EXCEPTION 'El movimiento % no es PRESTAMO y no debe tener filas en tablas de prestamo.', movimiento_id_input;
    END IF;
    RETURN;
  END IF;

  total := (CASE WHEN in_activo THEN 1 ELSE 0 END) + (CASE WHEN in_historial THEN 1 ELSE 0 END);
  IF total <> 1 THEN
    RAISE EXCEPTION 'El movimiento PRESTAMO % debe estar en exactamente una tabla (activo/historial). Actual: %.', movimiento_id_input, total;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_prestamo_partition_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.assert_prestamo_partition(COALESCE(NEW."movimiento_id", OLD."movimiento_id"));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "prestamo_partition_movimiento_chk" ON "movimiento";
CREATE CONSTRAINT TRIGGER "prestamo_partition_movimiento_chk"
AFTER INSERT OR UPDATE OF "tipo" ON "movimiento"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_partition_trigger();

DROP TRIGGER IF EXISTS "prestamo_partition_activo_chk" ON "prestamo_activo";
CREATE CONSTRAINT TRIGGER "prestamo_partition_activo_chk"
AFTER INSERT OR UPDATE OR DELETE ON "prestamo_activo"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_partition_trigger();

DROP TRIGGER IF EXISTS "prestamo_partition_historial_chk" ON "prestamo_historial";
CREATE CONSTRAINT TRIGGER "prestamo_partition_historial_chk"
AFTER INSERT OR UPDATE OR DELETE ON "prestamo_historial"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_partition_trigger();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "usuario") THEN
    INSERT INTO "usuario" (
      "usuario_id",
      "grado",
      "nombre",
      "apellido",
      "usuario",
      "password_hash",
      "rol",
      "activo",
      "created_at",
      "updated_at"
    ) VALUES (
      'migration-system',
      'S/D',
      'Migracion',
      'Sistema',
      'migration-system',
      'NO_LOGIN',
      'ADMIN',
      FALSE,
      now(),
      now()
    )
    ON CONFLICT ("usuario") DO NOTHING;
  END IF;
END $$;

WITH fallback_user AS (
  SELECT "usuario_id" FROM "usuario" ORDER BY "created_at" ASC LIMIT 1
)
INSERT INTO "movimiento" (
  "movimiento_id",
  "tipo",
  "fecha",
  "personal_ci",
  "usuario_entrega_id",
  "afecta_stock",
  "observaciones",
  "created_at",
  "updated_at"
)
SELECT
  r."registro_id",
  r."tipo"::TEXT::"tipo_movimiento",
  r."fecha",
  r."ci",
  COALESCE(
    (
      SELECT a."usuario_id"
      FROM "auditoria" a
      WHERE a."entidad" = 'REGISTRO'
        AND a."entidad_id" = r."registro_id"::TEXT
        AND a."usuario_id" IS NOT NULL
      ORDER BY a."created_at" ASC
      LIMIT 1
    ),
    (SELECT "usuario_id" FROM fallback_user)
  ),
  COALESCE(r."afecta_stock", FALSE),
  r."comentarios",
  r."created_at",
  r."created_at"
FROM "registro" r
WHERE r."tipo" IN ('ENTREGA', 'DEVOLUCION')
  AND NOT EXISTS (
    SELECT 1
    FROM "movimiento" m
    WHERE m."movimiento_id" = r."registro_id"
  );

WITH offset_data AS (
  SELECT COALESCE(MAX("registro_id"), 0)::BIGINT AS "registro_offset"
  FROM "registro"
),
prestamos_src AS (
  SELECT
    p.*,
    CASE
      WHEN p."destinatario_tipo" = 'PERSONAL' THEN p."destinatario_personal_ci"
      ELSE p."destinatario_oficial_suboficial_ci"
    END AS "personal_ci",
    p."prestamo_id" + (SELECT "registro_offset" FROM offset_data) AS "movimiento_id_migrado"
  FROM "prestamo" p
)
INSERT INTO "movimiento" (
  "movimiento_id",
  "tipo",
  "fecha",
  "personal_ci",
  "usuario_entrega_id",
  "afecta_stock",
  "observaciones",
  "created_at",
  "updated_at"
)
SELECT
  s."movimiento_id_migrado",
  'PRESTAMO',
  s."fecha_prestamo",
  s."personal_ci",
  s."usuario_entrega_id",
  TRUE,
  s."comentarios",
  s."created_at",
  s."updated_at"
FROM prestamos_src s
WHERE s."personal_ci" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "movimiento" m
    WHERE m."movimiento_id" = s."movimiento_id_migrado"
  );

INSERT INTO "movimiento_item" ("movimiento_id", "item_id", "cantidad")
SELECT
  r."registro_id",
  ri."item_id",
  ri."cantidad"
FROM "registro_item" ri
JOIN "registro" r
  ON r."registro_id" = ri."registro_id"
WHERE r."tipo" IN ('ENTREGA', 'DEVOLUCION')
  AND EXISTS (
    SELECT 1
    FROM "movimiento" m
    WHERE m."movimiento_id" = r."registro_id"
  )
ON CONFLICT ("movimiento_id", "item_id")
DO UPDATE SET "cantidad" = EXCLUDED."cantidad";

WITH offset_data AS (
  SELECT COALESCE(MAX("registro_id"), 0)::BIGINT AS "registro_offset"
  FROM "registro"
)
INSERT INTO "movimiento_item" ("movimiento_id", "item_id", "cantidad")
SELECT
  pi."prestamo_id" + (SELECT "registro_offset" FROM offset_data),
  pi."item_id",
  pi."cantidad"
FROM "prestamo_item" pi
ON CONFLICT ("movimiento_id", "item_id")
DO UPDATE SET "cantidad" = EXCLUDED."cantidad";

WITH offset_data AS (
  SELECT COALESCE(MAX("registro_id"), 0)::BIGINT AS "registro_offset"
  FROM "registro"
)
INSERT INTO "prestamo_activo" ("movimiento_id", "recibo_numero", "estado", "created_at", "updated_at")
SELECT
  p."prestamo_id" + (SELECT "registro_offset" FROM offset_data),
  p."recibo_numero",
  'PENDIENTE',
  p."created_at",
  p."updated_at"
FROM "prestamo" p
WHERE p."fecha_devolucion" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "prestamo_activo" pa
    WHERE pa."movimiento_id" = p."prestamo_id" + (SELECT "registro_offset" FROM offset_data)
  );

WITH offset_data AS (
  SELECT COALESCE(MAX("registro_id"), 0)::BIGINT AS "registro_offset"
  FROM "registro"
)
INSERT INTO "prestamo_historial" (
  "movimiento_id",
  "recibo_numero",
  "estado",
  "fecha_devolucion",
  "usuario_recibe_devolucion_id",
  "created_at",
  "updated_at"
)
SELECT
  p."prestamo_id" + (SELECT "registro_offset" FROM offset_data),
  p."recibo_numero",
  'DEVUELTO',
  p."fecha_devolucion",
  p."usuario_recibe_devolucion_id",
  p."updated_at",
  p."updated_at"
FROM "prestamo" p
WHERE p."fecha_devolucion" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "prestamo_historial" ph
    WHERE ph."movimiento_id" = p."prestamo_id" + (SELECT "registro_offset" FROM offset_data)
  );

SELECT setval(
  pg_get_serial_sequence('"movimiento"', 'movimiento_id'),
  COALESCE((SELECT MAX("movimiento_id") FROM "movimiento"), 1),
  TRUE
);
