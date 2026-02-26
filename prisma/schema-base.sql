DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO PUBLIC;

CREATE TYPE "tipo_registro" AS ENUM ('ENTREGA', 'DEVOLUCION', 'AJUSTE');
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

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
  "abreviacion" TEXT NOT NULL UNIQUE,
  "nombre_completo" TEXT NOT NULL UNIQUE
);

INSERT INTO "grado" ("abreviacion", "nombre_completo") VALUES
('Sgto', 'Sargento'),
(U&'Cabo 1\00B0', 'Cabo Primero'),
(U&'Cabo 2\00B0', 'Cabo Segundo'),
(U&'Sdo 1\00B0', 'Soldado Primero');

CREATE TABLE "bateria" (
  "bateria_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

INSERT INTO "bateria" ("nombre") VALUES
('Cdo. y Serv.'),
('Ba. Obus. "A"'),
('Ba. Obus. "B"'),
('S/ CIRR'),
('Cursando CIRR');

CREATE TABLE "talla_tipo" (
  "talla_tipo_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

INSERT INTO "talla_tipo" ("nombre") VALUES
('PARKA'), ('CAMISACO'), ('PANTALON'), ('KEPI'), ('CALZADO');

CREATE TABLE "item" (
  "item_id" BIGSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "requiere_talle" BOOLEAN NOT NULL DEFAULT FALSE,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "personal" (
  "ci" TEXT PRIMARY KEY,
  "apellido1" TEXT NOT NULL,
  "apellido2" TEXT,
  "nombre1" TEXT NOT NULL,
  "nombre2" TEXT,
  "fecha_ingreso" DATE,
  "grado_id" SMALLINT NOT NULL REFERENCES "grado"("grado_id"),
  "bateria_id" SMALLINT REFERENCES "bateria"("bateria_id"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "personal_ci_uruguaya_valida_chk" CHECK (public.es_ci_uruguaya_valida("ci")),
  CONSTRAINT "personal_fecha_ingreso_hoy_chk" CHECK ("fecha_ingreso" IS NULL OR "fecha_ingreso" <= CURRENT_DATE)
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

CREATE TABLE "registro" (
  "registro_id" BIGSERIAL PRIMARY KEY,
  "ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "fecha" DATE NOT NULL,
  "tipo" "tipo_registro" NOT NULL,
  "comentarios" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX "registro_ci_fecha_idx" ON "registro"("ci", "fecha" DESC);

CREATE TABLE "registro_item" (
  "registro_id" BIGINT NOT NULL REFERENCES "registro"("registro_id") ON DELETE CASCADE,
  "item_id" BIGINT NOT NULL REFERENCES "item"("item_id"),
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("registro_id", "item_id")
);

CREATE INDEX "registro_item_item_id_idx" ON "registro_item"("item_id");

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
  "username" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "rol" "user_role" NOT NULL DEFAULT 'VIEWER',
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

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
