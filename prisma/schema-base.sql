DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO PUBLIC;

CREATE TYPE "tipo_stock_operacion" AS ENUM ('INGRESO', 'EGRESO');
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'EDITOR', 'READ_ONLY');
CREATE TYPE "tipo_personal" AS ENUM ('SUBALTERNO', 'OFICIAL', 'SUBOFICIAL');
CREATE TYPE "tipo_movimiento" AS ENUM ('ENTREGA', 'DEVOLUCION', 'PRESTAMO');
CREATE TYPE "estado_prestamo_movimiento" AS ENUM ('PENDIENTE', 'DEVUELTO');

CREATE OR REPLACE FUNCTION public.es_ci_uruguaya_valida(ci_text TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
WITH cleaned AS (
  SELECT regexp_replace(coalesce(ci_text, ''), '[^0-9]', '', 'g') AS digits
),
parts AS (
  SELECT
    digits,
    length(digits) AS len,
    lpad(left(digits, greatest(length(digits) - 1, 0)), 7, '0') AS body,
    right(digits, 1) AS check_digit
  FROM cleaned
)
SELECT CASE
  WHEN len < 2 OR len > 8 THEN FALSE
  ELSE (
    (10 - (
      (
        substring(body FROM 1 FOR 1)::INT * 2 +
        substring(body FROM 2 FOR 1)::INT * 9 +
        substring(body FROM 3 FOR 1)::INT * 8 +
        substring(body FROM 4 FOR 1)::INT * 7 +
        substring(body FROM 5 FOR 1)::INT * 6 +
        substring(body FROM 6 FOR 1)::INT * 3 +
        substring(body FROM 7 FOR 1)::INT * 4
      ) % 10
    )) % 10
  ) = check_digit::INT
END
FROM parts;
$$;

CREATE TABLE "grado" (
  "grado_id" SMALLSERIAL PRIMARY KEY,
  "tipo" "tipo_personal" NOT NULL,
  "abreviacion" TEXT NOT NULL,
  "nombre_completo" TEXT NOT NULL,
  "orden" SMALLINT NOT NULL,
  CONSTRAINT "grado_tipo_abreviacion_uq" UNIQUE ("tipo", "abreviacion"),
  CONSTRAINT "grado_tipo_nombre_completo_uq" UNIQUE ("tipo", "nombre_completo"),
  CONSTRAINT "grado_id_tipo_uq" UNIQUE ("grado_id", "tipo")
);

CREATE INDEX "grado_tipo_orden_idx" ON "grado"("tipo", "orden");
CREATE INDEX "grado_orden_idx" ON "grado"("orden");

INSERT INTO "grado" ("tipo", "abreviacion", "nombre_completo", "orden") VALUES
('OFICIAL', 'Tte. Cnel.', 'Teniente Coronel', 1),
('OFICIAL', 'May.', 'Mayor', 2),
('OFICIAL', 'Cap.', 'Capitan', 3),
('OFICIAL', U&'Tte. 1\00B0', 'Teniente Primero', 4),
('OFICIAL', U&'Tte. 2\00B0', 'Teniente Segundo', 5),
('OFICIAL', 'Alf.', 'Alferez', 6),
('SUBOFICIAL', 'S.O.M', 'Sub Oficial Mayor', 1),
('SUBOFICIAL', U&'Sgto. 1\00B0', 'Sargento Primero', 2),
('SUBALTERNO', 'Sgto.', 'Sargento', 1),
('SUBALTERNO', U&'Cabo 1\00B0', 'Cabo de Primera', 2),
('SUBALTERNO', U&'Cabo 2\00B0', 'Cabo de Segunda', 3),
('SUBALTERNO', U&'Sdo. 1\00B0', 'Soldado de Primera', 4),
('SUBALTERNO', U&'Sdo. 1\00B0 C/CIRR', 'Soldado de Primera Cursando CIRR', 5),
('SUBALTERNO', U&'Sdo. 1\00B0 S/CIRR', 'Soldado de Primera Sin CIRR', 6);

CREATE TABLE "bateria" (
  "bateria_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "orden" SMALLINT NOT NULL
);

CREATE INDEX "bateria_orden_idx" ON "bateria"("orden");

INSERT INTO "bateria" ("nombre", "orden") VALUES
('Cdo. y Serv.', 1),
('Ba. Obus. "A"', 2),
('Ba. Obus. "B"', 3);

CREATE TABLE "talla_tipo" (
  "talla_tipo_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

INSERT INTO "talla_tipo" ("nombre") VALUES
('PARKA'), ('CAMISACO'), ('PANTALON'), ('KEPI'), ('CALZADO');

CREATE TABLE "item" (
  "item_id" BIGSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "orden_pdf" INTEGER NOT NULL
);

CREATE INDEX "item_orden_pdf_nombre_idx" ON "item"("orden_pdf", "nombre");

INSERT INTO "item" ("nombre", "activo", "orden_pdf") VALUES
('Buzo Verde M/C', TRUE, 1),
('Buzo M/L V/Oliva', TRUE, 2),
('Parka Pixelada 4A', TRUE, 3),
('Birrete Eq. Pixelado A4', TRUE, 4),
('Camisaco Eq. Pixelado A4', TRUE, 5),
('Pantalon Eq. Pixelado A4', TRUE, 6),
('Birrete Eq.Pixelado', TRUE, 7),
('Camisaco Eq.Pixelado', TRUE, 8),
('Pantalon Eq.Pixelado', TRUE, 9),
('Parka Pixelada', TRUE, 10),
('Campera Eq. Deportivo Largo', TRUE, 11),
('Pantalon Eq. Deportivo Largo', TRUE, 12),
('Buzo Verde Polar.', TRUE, 13),
('Medias Verdes', TRUE, 14),
('Equipo Termico', TRUE, 15),
('Funda de Almohada', TRUE, 16),
('Sabanas', TRUE, 17),
('Arnes Combate (Y)', TRUE, 18),
('Arnes de tela (H)', TRUE, 19),
('Cinturon de Combate tela (H)', TRUE, 20),
('Cinturon de combate (Y)', TRUE, 21),
('Frazada', TRUE, 22),
('Bota Corta de Cuero SIE', TRUE, 23),
('Bota Corta de tela S.I.E.', TRUE, 24);

CREATE TABLE "personal" (
  "ci" TEXT PRIMARY KEY,
  "tipo" "tipo_personal" NOT NULL,
  "apellido1" TEXT NOT NULL,
  "apellido2" TEXT,
  "nombre1" TEXT NOT NULL,
  "nombre2" TEXT,
  "telefono_contacto" TEXT,
  "grado_id" SMALLINT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "personal_ci_uruguaya_valida_chk" CHECK (public.es_ci_uruguaya_valida("ci")),
  CONSTRAINT "personal_telefono_contacto_uy_chk" CHECK ("telefono_contacto" IS NULL OR "telefono_contacto" ~ '^09[0-9]{7}$'),
  CONSTRAINT "personal_grado_tipo_fk" FOREIGN KEY ("grado_id", "tipo") REFERENCES "grado"("grado_id", "tipo")
);

CREATE INDEX "personal_tipo_idx" ON "personal"("tipo");
CREATE INDEX "personal_grado_id_tipo_idx" ON "personal"("grado_id", "tipo");

CREATE TABLE "subalterno" (
  "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
  "es_reingreso" BOOLEAN NOT NULL DEFAULT FALSE,
  "fecha_ingreso" DATE,
  "fecha_ingreso_original" DATE,
  "bateria_id" SMALLINT REFERENCES "bateria"("bateria_id"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "subalterno_fecha_ingreso_hoy_chk" CHECK ("fecha_ingreso" IS NULL OR "fecha_ingreso" <= CURRENT_DATE),
  CONSTRAINT "subalterno_fecha_ingreso_original_hoy_chk" CHECK ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= CURRENT_DATE),
  CONSTRAINT "subalterno_reingreso_chk" CHECK (
    ("es_reingreso" = FALSE AND "fecha_ingreso_original" IS NULL)
    OR (
      "es_reingreso" = TRUE
      AND "fecha_ingreso" IS NOT NULL
      AND ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= "fecha_ingreso")
    )
  )
);

CREATE INDEX "subalterno_bateria_id_idx" ON "subalterno"("bateria_id");

CREATE TABLE "oficial" (
  "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "suboficial" (
  "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "personal_talla" (
  "ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "talla_tipo_id" SMALLINT NOT NULL REFERENCES "talla_tipo"("talla_tipo_id"),
  "talla_valor" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "personal_talla_valor_permitido_chk" CHECK (
    ("talla_tipo_id" IN (1, 2, 3) AND "talla_valor" IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'))
    OR ("talla_tipo_id" = 4 AND "talla_valor" IN ('54', '55', '56', '57', '58', '59', '60', '61', '62', '63'))
    OR ("talla_tipo_id" = 5 AND "talla_valor" IN ('34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'))
  ),
  PRIMARY KEY ("ci", "talla_tipo_id")
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

CREATE TABLE "stock_operacion" (
  "stock_operacion_id" BIGSERIAL PRIMARY KEY,
  "fecha" DATE NOT NULL,
  "tipo" "tipo_stock_operacion" NOT NULL,
  "comentarios" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "stock_operacion_fecha_idx" ON "stock_operacion"("fecha" DESC);

CREATE TABLE "stock_operacion_item" (
  "stock_operacion_id" BIGINT NOT NULL REFERENCES "stock_operacion"("stock_operacion_id") ON DELETE CASCADE,
  "item_id" BIGINT NOT NULL REFERENCES "item"("item_id"),
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("stock_operacion_id", "item_id")
);

CREATE INDEX "stock_operacion_item_item_id_idx" ON "stock_operacion_item"("item_id");

CREATE TABLE "observacion" (
  "observacion_id" BIGSERIAL PRIMARY KEY,
  "ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "fecha" DATE NOT NULL,
  "texto" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "observacion_ci_fecha_idx" ON "observacion"("ci", "fecha" DESC);

CREATE TABLE "usuario" (
  "usuario_id" TEXT PRIMARY KEY,
  "grado" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "apellido" TEXT NOT NULL,
  "usuario" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "mail_referencia" TEXT,
  "rol" "user_role" NOT NULL DEFAULT 'EDITOR',
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "movimiento" (
  "movimiento_id" BIGSERIAL PRIMARY KEY,
  "tipo" "tipo_movimiento" NOT NULL,
  "fecha" DATE NOT NULL,
  "personal_ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "usuario_entrega_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id"),
  "afecta_stock" BOOLEAN NOT NULL DEFAULT TRUE,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "movimiento_fecha_hoy_chk" CHECK ("fecha" <= CURRENT_DATE),
  CONSTRAINT "movimiento_prestamo_afecta_stock_chk" CHECK ("tipo" <> 'PRESTAMO' OR "afecta_stock" = TRUE)
);

CREATE INDEX "movimiento_personal_ci_fecha_idx" ON "movimiento"("personal_ci", "fecha" DESC);
CREATE INDEX "movimiento_tipo_fecha_idx" ON "movimiento"("tipo", "fecha" DESC);
CREATE INDEX "movimiento_usuario_entrega_id_fecha_idx" ON "movimiento"("usuario_entrega_id", "fecha" DESC);

CREATE TABLE "movimiento_item" (
  "movimiento_id" BIGINT NOT NULL REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "item_id" BIGINT NOT NULL REFERENCES "item"("item_id") ON DELETE CASCADE,
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("movimiento_id", "item_id")
);

CREATE INDEX "movimiento_item_item_id_idx" ON "movimiento_item"("item_id");

CREATE TABLE "prestamo_activo" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "recibo_numero" TEXT NOT NULL UNIQUE,
  "estado" "estado_prestamo_movimiento" NOT NULL DEFAULT 'PENDIENTE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "prestamo_activo_estado_chk" CHECK ("estado" = 'PENDIENTE')
);

CREATE INDEX "prestamo_activo_estado_created_at_idx" ON "prestamo_activo"("estado", "created_at" DESC);

CREATE TABLE "prestamo_historial" (
  "historial_id" BIGSERIAL PRIMARY KEY,
  "movimiento_id" BIGINT NOT NULL UNIQUE REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "recibo_numero" TEXT NOT NULL UNIQUE,
  "estado" "estado_prestamo_movimiento" NOT NULL DEFAULT 'DEVUELTO',
  "fecha_devolucion" DATE NOT NULL,
  "usuario_recibe_devolucion_id" TEXT REFERENCES "usuario"("usuario_id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "prestamo_historial_estado_chk" CHECK ("estado" = 'DEVUELTO'),
  CONSTRAINT "prestamo_historial_fecha_hoy_chk" CHECK ("fecha_devolucion" <= CURRENT_DATE)
);

CREATE INDEX "prestamo_historial_fecha_devolucion_idx" ON "prestamo_historial"("fecha_devolucion" DESC);
CREATE INDEX "prestamo_historial_usuario_recibe_fecha_idx" ON "prestamo_historial"("usuario_recibe_devolucion_id", "fecha_devolucion" DESC);

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

CREATE TRIGGER "prestamo_activo_tipo_trg"
BEFORE INSERT OR UPDATE ON "prestamo_activo"
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_child_tipo();

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

CREATE CONSTRAINT TRIGGER "prestamo_partition_movimiento_chk"
AFTER INSERT OR UPDATE OF "tipo" ON "movimiento"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_partition_trigger();

CREATE CONSTRAINT TRIGGER "prestamo_partition_activo_chk"
AFTER INSERT OR UPDATE OR DELETE ON "prestamo_activo"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_partition_trigger();

CREATE CONSTRAINT TRIGGER "prestamo_partition_historial_chk"
AFTER INSERT OR UPDATE OR DELETE ON "prestamo_historial"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_prestamo_partition_trigger();

CREATE TABLE "config_firma" (
  "id" SMALLINT PRIMARY KEY,
  "encargado_rango" TEXT NOT NULL,
  "encargado_nombre" TEXT NOT NULL,
  "oficial_rango" TEXT NOT NULL,
  "oficial_nombre" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

INSERT INTO "config_firma" (
  "id",
  "encargado_rango",
  "encargado_nombre",
  "oficial_rango",
  "oficial_nombre"
) VALUES (
  1,
  'Sgto.',
  'Wilson Lara',
  'Tte.2',
  'Gerardo Otero'
);

CREATE TABLE "password_reset" (
  "reset_id" TEXT PRIMARY KEY,
  "usuario_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "password_reset_usuario_id_idx" ON "password_reset"("usuario_id");
CREATE INDEX "password_reset_expires_at_idx" ON "password_reset"("expires_at");

CREATE TABLE "sesion" (
  "sesion_id" TEXT PRIMARY KEY,
  "token_hash" TEXT NOT NULL UNIQUE,
  "usuario_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "sesion_usuario_id_idx" ON "sesion"("usuario_id");
CREATE INDEX "sesion_expires_at_idx" ON "sesion"("expires_at");

CREATE TABLE "auditoria" (
  "auditoria_id" BIGSERIAL PRIMARY KEY,
  "usuario_id" TEXT REFERENCES "usuario"("usuario_id") ON DELETE SET NULL,
  "accion" TEXT NOT NULL,
  "entidad" TEXT NOT NULL,
  "entidad_id" TEXT,
  "detalle" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "auditoria_created_at_desc_idx" ON "auditoria"("created_at" DESC);
CREATE INDEX "auditoria_usuario_id_created_at_desc_idx" ON "auditoria"("usuario_id", "created_at" DESC);
