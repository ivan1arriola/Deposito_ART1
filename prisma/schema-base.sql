DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO PUBLIC;

CREATE TYPE "tipo_stock_operacion" AS ENUM ('INGRESO', 'EGRESO');
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'DESARROLLADOR', 'EDITOR', 'READ_ONLY');
CREATE TYPE "tipo_personal" AS ENUM ('SUBALTERNO', 'OFICIAL', 'SUBOFICIAL');
CREATE TYPE "tipo_articulo" AS ENUM ('OFICINA', 'LIMPIEZA');
CREATE TYPE "tipo_articulo_stock_movimiento" AS ENUM ('INGRESO', 'EGRESO');
CREATE TYPE "tipo_movimiento" AS ENUM ('ENTREGA', 'DEVOLUCION', 'ASIGNACION', 'PRESTAMO');
CREATE TYPE "estado_prestamo_movimiento" AS ENUM ('PENDIENTE', 'DEVUELTO');
CREATE TYPE "estado_equipo_prestamo" AS ENUM ('NUEVO', 'BUENO', 'REGULAR', 'MALO');
CREATE TYPE "prioridad_recordatorio" AS ENUM ('NORMAL', 'URGENTE');

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
('OFICIAL', 'Cap.', U&'Capit\00E1n', 3),
('OFICIAL', U&'Tte. 1\00B0', 'Teniente Primero', 4),
('OFICIAL', U&'Tte. 2\00B0', 'Teniente Segundo', 5),
('OFICIAL', 'Alf.', U&'Alf\00E9rez', 6),
('SUBOFICIAL', 'S.O.M', 'Sub Oficial Mayor', 1),
('SUBOFICIAL', U&'Sgto. 1\00B0', 'Sargento Primero', 2),
('SUBALTERNO', 'Sgto.', 'Sargento', 1),
('SUBALTERNO', U&'Cabo 1\00B0', 'Cabo de Primera', 2),
('SUBALTERNO', U&'Cabo 2\00B0', 'Cabo de Segunda', 3),
('SUBALTERNO', U&'Sdo. 1\00B0', 'Soldado de Primera', 4),
('SUBALTERNO', U&'Sdo. 1\00B0 C/ CIRR', 'Soldado de Primera Cursando CIRR', 5),
('SUBALTERNO', U&'Sdo. 1\00B0 S/ CIRR', 'Soldado de Primera Sin CIRR', 6);

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

CREATE TABLE "articulo" (
  "articulo_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "tipo" "tipo_articulo" NOT NULL,
  "stock_actual" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "articulo_tipo_idx" ON "articulo"("tipo");

CREATE TABLE "tipo_equipo" (
  "tipo_equipo_id" SMALLSERIAL PRIMARY KEY,
  "clave" TEXT NOT NULL UNIQUE,
  "nombre" TEXT NOT NULL UNIQUE,
  "orden" SMALLINT NOT NULL
);

CREATE INDEX "tipo_equipo_orden_idx" ON "tipo_equipo"("orden");

INSERT INTO "tipo_equipo" ("clave", "nombre", "orden") VALUES
('FRI', 'F.R.I', 1);

CREATE TABLE "talla_tipo" (
  "talla_tipo_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

INSERT INTO "talla_tipo" ("nombre") VALUES
('PARKA'), ('CAMISACO'), ('PANTALON'), ('KEPI'), ('CALZADO');

CREATE TABLE "equipos" (
  "equipo_id" BIGSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "tipo_equipo_id" SMALLINT REFERENCES "tipo_equipo"("tipo_equipo_id") ON DELETE SET NULL,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "orden_pdf" INTEGER NOT NULL,
  "existencia_sie" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "equipo_tipo_equipo_id_idx" ON "equipos"("tipo_equipo_id");

CREATE INDEX "equipo_orden_pdf_nombre_idx" ON "equipos"("orden_pdf", "nombre");

INSERT INTO "equipos" ("nombre", "activo", "orden_pdf") VALUES
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

CREATE TABLE "estanteria" (
  "codigo" VARCHAR(1) NOT NULL,
  "piso" SMALLINT NOT NULL,
  CONSTRAINT "estanteria_codigo_formato_chk" CHECK ("codigo" ~ '^[A-Z]$'),
  CONSTRAINT "estanteria_piso_rango_chk" CHECK ("piso" >= 1 AND "piso" <= 2),
  PRIMARY KEY ("codigo", "piso")
);

CREATE TABLE "equipo_codigo_sie" (
  "equipo_codigo_sie_id" BIGSERIAL PRIMARY KEY,
  "codigo" TEXT NOT NULL,
  "talla" TEXT NOT NULL DEFAULT '-',
  "equipo_id" BIGINT NOT NULL REFERENCES "equipos"("equipo_id") ON DELETE CASCADE,
  CONSTRAINT "equipo_codigo_sie_codigo_formato_chk" CHECK ("codigo" ~ '^([0-9]{8}|[A-Z]{3}[0-9]{2})$'),
  CONSTRAINT "equipo_codigo_sie_codigo_talla_equipo_uq" UNIQUE ("codigo", "talla", "equipo_id")
);

CREATE INDEX "equipo_codigo_sie_equipo_id_idx" ON "equipo_codigo_sie"("equipo_id");
CREATE INDEX "equipo_codigo_sie_codigo_idx" ON "equipo_codigo_sie"("codigo");

CREATE TABLE "caja" (
  "codigo_deposito_general" INTEGER PRIMARY KEY,
  "estanteria" VARCHAR(1) NOT NULL,
  "piso" SMALLINT NOT NULL,
  CONSTRAINT "caja_codigo_deposito_general_chk" CHECK ("codigo_deposito_general" > 0),
  CONSTRAINT "caja_estanteria_formato_chk" CHECK ("estanteria" ~ '^[A-Z]$'),
  CONSTRAINT "caja_piso_rango_chk" CHECK ("piso" >= 1 AND "piso" <= 2),
  CONSTRAINT "caja_estanteria_fk"
    FOREIGN KEY ("estanteria", "piso")
    REFERENCES "estanteria"("codigo", "piso")
    ON DELETE RESTRICT
);

CREATE INDEX "caja_estanteria_piso_idx" ON "caja"("estanteria", "piso");

CREATE TABLE "caja_equipo" (
  "codigo_deposito_general" INTEGER NOT NULL,
  "equipo_id" BIGINT NOT NULL,
  "cantidad" INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY ("codigo_deposito_general", "equipo_id"),
  CONSTRAINT "caja_equipo_cantidad_chk" CHECK ("cantidad" > 0),
  CONSTRAINT "caja_equipo_caja_fk"
    FOREIGN KEY ("codigo_deposito_general")
    REFERENCES "caja"("codigo_deposito_general")
    ON DELETE CASCADE,
  CONSTRAINT "caja_equipo_equipo_fk"
    FOREIGN KEY ("equipo_id")
    REFERENCES "equipos"("equipo_id")
    ON DELETE RESTRICT
);

CREATE INDEX "caja_equipo_equipo_id_idx" ON "caja_equipo"("equipo_id");

CREATE TABLE "caja_equipo_codigo_sie" (
  "codigo_deposito_general" INTEGER NOT NULL,
  "equipo_codigo_sie_id" BIGINT NOT NULL,
  PRIMARY KEY ("codigo_deposito_general", "equipo_codigo_sie_id"),
  CONSTRAINT "caja_equipo_codigo_sie_caja_fk"
    FOREIGN KEY ("codigo_deposito_general")
    REFERENCES "caja"("codigo_deposito_general")
    ON DELETE CASCADE,
  CONSTRAINT "caja_equipo_codigo_sie_sie_fk"
    FOREIGN KEY ("equipo_codigo_sie_id")
    REFERENCES "equipo_codigo_sie"("equipo_codigo_sie_id")
    ON DELETE CASCADE
);

CREATE INDEX "caja_equipo_codigo_sie_sie_id_idx" ON "caja_equipo_codigo_sie"("equipo_codigo_sie_id");

CREATE TABLE "personal" (
  "ci" TEXT PRIMARY KEY,
  "apellido1" TEXT NOT NULL,
  "apellido2" TEXT,
  "nombre1" TEXT NOT NULL,
  "nombre2" TEXT,
  "telefono_contacto" TEXT,
  "grado_id" SMALLINT NOT NULL,
  "tipo" "tipo_personal" NOT NULL,
  "bateria_id" SMALLINT REFERENCES "bateria"("bateria_id") ON DELETE SET NULL,
  "es_reingreso" BOOLEAN NOT NULL DEFAULT FALSE,
  "fecha_ingreso" DATE,
  "fecha_ingreso_original" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "personal_ci_uruguaya_valida_chk" CHECK (public.es_ci_uruguaya_valida("ci")),
  CONSTRAINT "personal_telefono_contacto_uy_chk" CHECK ("telefono_contacto" IS NULL OR "telefono_contacto" ~ '^09[0-9]{7}$'),
  CONSTRAINT "personal_grado_fk" FOREIGN KEY ("grado_id") REFERENCES "grado"("grado_id")
);

CREATE INDEX "personal_grado_id_idx" ON "personal"("grado_id");
CREATE INDEX "personal_bateria_id_idx" ON "personal"("bateria_id");
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

CREATE TABLE "stock_operacion" (
  "stock_operacion_id" BIGSERIAL PRIMARY KEY,
  "fecha" DATE NOT NULL,
  "tipo" "tipo_stock_operacion" NOT NULL,
  "comentarios" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "stock_operacion_fecha_idx" ON "stock_operacion"("fecha" DESC);

CREATE TABLE "stock_operacion_equipo" (
  "stock_operacion_id" BIGINT NOT NULL REFERENCES "stock_operacion"("stock_operacion_id") ON DELETE CASCADE,
  "equipo_id" BIGINT NOT NULL REFERENCES "equipos"("equipo_id") ON DELETE RESTRICT,
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("stock_operacion_id", "equipo_id")
);

CREATE INDEX "stock_operacion_equipo_equipo_id_idx" ON "stock_operacion_equipo"("equipo_id");

CREATE TABLE "observacion" (
  "observacion_id" BIGSERIAL PRIMARY KEY,
  "ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "fecha" DATE NOT NULL,
  "texto" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "observacion_ci_fecha_idx" ON "observacion"("ci", "fecha" DESC);

CREATE TABLE "personal_auth" (
  "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
  "password_hash" TEXT NOT NULL,
  "mail_referencia" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "personal_auth_activo_idx" ON "personal_auth"("activo");

CREATE TABLE "usuario" (
  "usuario_id" TEXT PRIMARY KEY,
  "grado_id" SMALLINT REFERENCES "grado"("grado_id"),
  "nombre" TEXT NOT NULL,
  "apellido" TEXT NOT NULL,
  "usuario" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "mail_referencia" TEXT,
  "mail_verificada_at" TIMESTAMPTZ(6),
  "rol" "user_role" NOT NULL DEFAULT 'EDITOR',
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "usuario_grado_id_idx" ON "usuario"("grado_id");

CREATE TABLE "usuario_recordatorio_config" (
  "usuario_id" TEXT PRIMARY KEY REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "mostrar_muneco" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE "usuario_recordatorio_tarea" (
  "tarea_id" BIGSERIAL PRIMARY KEY,
  "usuario_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "titulo" TEXT NOT NULL,
  "nota" TEXT,
  "fecha_limite" DATE,
  "prioridad" "prioridad_recordatorio" NOT NULL DEFAULT 'NORMAL',
  "completada" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "usuario_recordatorio_tarea_usuario_completada_fecha_idx"
  ON "usuario_recordatorio_tarea"("usuario_id", "completada", "prioridad", "fecha_limite");

CREATE TABLE "articulo_entrega_personal" (
  "articulo_entrega_personal_id" BIGSERIAL PRIMARY KEY,
  "personal_ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE RESTRICT,
  "usuario_entrega_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT,
  "ordenante_ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE RESTRICT,
  "fecha" DATE NOT NULL,
  "comentario" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "articulo_entrega_personal_fecha_hoy_chk" CHECK ("fecha" <= CURRENT_DATE)
);

CREATE INDEX "articulo_entrega_personal_personal_ci_fecha_idx"
  ON "articulo_entrega_personal"("personal_ci", "fecha" DESC);
CREATE INDEX "articulo_entrega_personal_usuario_entrega_id_fecha_idx"
  ON "articulo_entrega_personal"("usuario_entrega_id", "fecha" DESC);
CREATE INDEX "articulo_entrega_personal_ordenante_ci_fecha_idx"
  ON "articulo_entrega_personal"("ordenante_ci", "fecha" DESC);

CREATE TABLE "articulo_stock_movimiento" (
  "articulo_stock_movimiento_id" BIGSERIAL PRIMARY KEY,
  "articulo_id" SMALLINT NOT NULL REFERENCES "articulo"("articulo_id") ON DELETE RESTRICT,
  "tipo" "tipo_articulo_stock_movimiento" NOT NULL,
  "cantidad" INTEGER NOT NULL,
  "comentario" TEXT,
  "articulo_entrega_personal_id" BIGINT REFERENCES "articulo_entrega_personal"("articulo_entrega_personal_id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "articulo_stock_movimiento_cantidad_chk" CHECK ("cantidad" > 0),
  CONSTRAINT "articulo_stock_movimiento_tipo_entrega_chk" CHECK (
    ("tipo" = 'INGRESO' AND "articulo_entrega_personal_id" IS NULL)
    OR ("tipo" = 'EGRESO' AND "articulo_entrega_personal_id" IS NOT NULL)
  )
);

CREATE INDEX "articulo_stock_movimiento_articulo_fecha_idx"
  ON "articulo_stock_movimiento"("articulo_id", "created_at" DESC);
CREATE INDEX "articulo_stock_movimiento_tipo_fecha_idx"
  ON "articulo_stock_movimiento"("tipo", "created_at" DESC);
CREATE INDEX "articulo_stock_movimiento_entrega_fecha_idx"
  ON "articulo_stock_movimiento"("articulo_entrega_personal_id", "created_at" DESC);

CREATE TABLE "movimiento" (
  "movimiento_id" BIGSERIAL PRIMARY KEY,
  "tipo" "tipo_movimiento" NOT NULL,
  "fecha" DATE NOT NULL,
  "usuario_entrega_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id"),
  "afecta_stock" BOOLEAN NOT NULL DEFAULT TRUE,
  "observaciones" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "movimiento_fecha_hoy_chk" CHECK ("fecha" <= CURRENT_DATE),
  CONSTRAINT "movimiento_prestamo_afecta_stock_chk" CHECK ("afecta_stock" = TRUE)
);

CREATE INDEX "movimiento_tipo_fecha_idx" ON "movimiento"("tipo", "fecha" DESC);
CREATE INDEX "movimiento_usuario_entrega_id_fecha_idx" ON "movimiento"("usuario_entrega_id", "fecha" DESC);

CREATE TABLE "persona_externa" (
  "ci" TEXT PRIMARY KEY,
  "grado" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "apellido" TEXT NOT NULL,
  "unidad_destino" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "persona_externa_ci_uruguaya_valida_chk" CHECK (public.es_ci_uruguaya_valida("ci"))
);

CREATE INDEX "persona_externa_apellido_nombre_idx" ON "persona_externa"("apellido", "nombre");

CREATE TABLE "movimiento_destinatario_personal" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "ci" TEXT NOT NULL REFERENCES "personal"("ci")
);

CREATE INDEX "movimiento_destinatario_personal_ci_idx"
  ON "movimiento_destinatario_personal"("ci");

CREATE TABLE "movimiento_destinatario_externo" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "persona_externa_ci" TEXT NOT NULL REFERENCES "persona_externa"("ci")
);

CREATE INDEX "movimiento_destinatario_externo_persona_externa_ci_idx"
  ON "movimiento_destinatario_externo"("persona_externa_ci");

CREATE TABLE "movimiento_destinatario_recinto" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "clase" VARCHAR(16) NOT NULL,
  "nombre" TEXT NOT NULL,
  CONSTRAINT "movimiento_destinatario_recinto_clase_chk" CHECK ("clase" IN ('INTERNO', 'EXTERNO')),
  CONSTRAINT "movimiento_destinatario_recinto_nombre_chk" CHECK (btrim("nombre") <> '')
);

CREATE INDEX "movimiento_destinatario_recinto_clase_idx"
  ON "movimiento_destinatario_recinto"("clase");

CREATE INDEX "movimiento_destinatario_recinto_nombre_idx"
  ON "movimiento_destinatario_recinto"("nombre");

CREATE TABLE "movimiento_equipo" (
  "movimiento_id" BIGINT NOT NULL REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "equipo_id" BIGINT NOT NULL REFERENCES "equipos"("equipo_id") ON DELETE RESTRICT,
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  "estado_entrega" "estado_equipo_prestamo" NOT NULL DEFAULT 'NUEVO',
  "comentario_entrega" TEXT,
  "estado_devolucion" "estado_equipo_prestamo",
  "comentario_devolucion" TEXT,
  PRIMARY KEY ("movimiento_id", "equipo_id")
);

CREATE INDEX "movimiento_equipo_equipo_id_idx" ON "movimiento_equipo"("equipo_id");

CREATE TABLE "prestamo_activo" (
  "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
  "recibo_numero" TEXT NOT NULL UNIQUE,
  "estado" "estado_prestamo_movimiento" NOT NULL DEFAULT 'PENDIENTE',
  "fecha_estimada_devolucion_texto" TEXT,
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
  "fecha_estimada_devolucion_texto" TEXT,
  "usuario_recibe_devolucion_id" TEXT REFERENCES "usuario"("usuario_id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "prestamo_historial_estado_chk" CHECK ("estado" = 'DEVUELTO'),
  CONSTRAINT "prestamo_historial_fecha_hoy_chk" CHECK ("fecha_devolucion" <= CURRENT_DATE)
);

CREATE INDEX "prestamo_historial_fecha_devolucion_idx" ON "prestamo_historial"("fecha_devolucion" DESC);
CREATE INDEX "prestamo_historial_usuario_recibe_fecha_idx" ON "prestamo_historial"("usuario_recibe_devolucion_id", "fecha_devolucion" DESC);

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
  WHERE m."movimiento_id" = NEW."movimiento_id"
  ;

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

  IF movimiento_tipo NOT IN ('PRESTAMO', 'ASIGNACION') THEN
    RAISE EXCEPTION 'Solo los préstamos y asignaciones pueden tener destinatario externo. Movimiento % es %.', NEW."movimiento_id", movimiento_tipo;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "movimiento_destinatario_externo_trg"
BEFORE INSERT OR UPDATE ON "movimiento_destinatario_externo"
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatario_externo();

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

  IF movimiento_tipo <> 'ASIGNACION' THEN
    RAISE EXCEPTION 'Solo las asignaciones pueden tener destinatario recinto. Movimiento % es %.', NEW."movimiento_id", movimiento_tipo;
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
    IF total <> 1 OR NOT in_personal THEN
      RAISE EXCEPTION 'El movimiento % de tipo % debe tener exactamente un destinatario personal.', movimiento_id_input, movimiento_tipo;
      END IF;
      RETURN;
  END IF;

  IF movimiento_tipo = 'ASIGNACION' THEN
    IF total <> 1 THEN
      RAISE EXCEPTION 'La asignación % debe tener exactamente un destinatario.', movimiento_id_input;
    END IF;
    RETURN;
  END IF;

  IF movimiento_tipo = 'PRESTAMO' AND (in_recinto OR total > 1) THEN
    RAISE EXCEPTION 'El préstamo % no puede combinar destinatarios incompatibles.', movimiento_id_input;
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

CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_movimiento_chk"
AFTER INSERT OR UPDATE OF "tipo", "afecta_stock" ON "movimiento"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();

CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_personal_chk"
AFTER INSERT OR UPDATE OR DELETE ON "movimiento_destinatario_personal"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();

CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_externo_chk"
AFTER INSERT OR UPDATE OR DELETE ON "movimiento_destinatario_externo"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();

CREATE CONSTRAINT TRIGGER "movimiento_destinatarios_recinto_chk"
AFTER INSERT OR UPDATE OR DELETE ON "movimiento_destinatario_recinto"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_movimiento_destinatarios_trigger();

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
  "token_type" TEXT NOT NULL DEFAULT 'PASSWORD_RESET',
  "mail_snapshot" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "password_reset_usuario_id_idx" ON "password_reset"("usuario_id");
CREATE INDEX "password_reset_expires_at_idx" ON "password_reset"("expires_at");
CREATE INDEX "password_reset_token_type_expires_at_idx" ON "password_reset"("token_type", "expires_at");

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

CREATE TABLE "web_push_subscription" (
  "subscription_id" BIGSERIAL PRIMARY KEY,
  "usuario_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "idx_web_push_subscription_usuario" ON "web_push_subscription"("usuario_id");
CREATE INDEX "idx_web_push_subscription_enabled" ON "web_push_subscription"("enabled");
