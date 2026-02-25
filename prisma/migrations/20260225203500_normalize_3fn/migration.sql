-- 3FN normalization:
-- - Catalog tables: rango, bateria, talla_tipo, item
-- - personal with ci as PK and FK to rango/bateria
-- - personal_talla by talla type
-- - registro header + registro_item detail
-- - observacion separated by person/date

-- 1) Catalogs
CREATE TABLE "rango" (
  "rango_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

CREATE TABLE "bateria" (
  "bateria_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

CREATE TABLE "talla_tipo" (
  "talla_tipo_id" SMALLSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE
);

INSERT INTO "talla_tipo" ("nombre") VALUES
('PARKA'),
('CAMISACO'),
('PANTALON'),
('KEPI'),
('CALZADO')
ON CONFLICT ("nombre") DO NOTHING;

CREATE TABLE "item" (
  "item_id" BIGSERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "requiere_talle" BOOLEAN NOT NULL DEFAULT FALSE,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE
);

-- Preserve existing catalog values from old tables
INSERT INTO "rango" ("nombre")
SELECT DISTINCT TRIM(r."nombre")
FROM "Rango" r
WHERE r."nombre" IS NOT NULL AND TRIM(r."nombre") <> ''
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "bateria" ("nombre")
SELECT DISTINCT TRIM(b."nombre")
FROM "Bateria" b
WHERE b."nombre" IS NOT NULL AND TRIM(b."nombre") <> ''
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "rango" ("nombre") VALUES ('SIN RANGO')
ON CONFLICT ("nombre") DO NOTHING;

INSERT INTO "bateria" ("nombre") VALUES ('SIN BATERIA')
ON CONFLICT ("nombre") DO NOTHING;

-- 2) Personal (CI as PK)
CREATE TABLE "personal" (
  "ci" TEXT PRIMARY KEY,
  "apellido1" TEXT NOT NULL,
  "apellido2" TEXT,
  "nombre1" TEXT NOT NULL,
  "nombre2" TEXT,
  "fecha_ingreso" DATE,
  "rango_id" SMALLINT NOT NULL REFERENCES "rango"("rango_id"),
  "bateria_id" SMALLINT NOT NULL REFERENCES "bateria"("bateria_id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "personal_rango_id_idx" ON "personal"("rango_id");
CREATE INDEX "personal_bateria_id_idx" ON "personal"("bateria_id");

-- Migrate personal from old structure
INSERT INTO "personal" (
  "ci",
  "apellido1",
  "apellido2",
  "nombre1",
  "nombre2",
  "fecha_ingreso",
  "rango_id",
  "bateria_id",
  "created_at",
  "updated_at"
)
SELECT
  p."cedulaIdentidad" AS ci,
  p."apellido1",
  NULLIF(TRIM(p."apellido2"), '') AS apellido2,
  p."nombre1",
  NULLIF(TRIM(p."nombre2"), '') AS nombre2,
  p."fechaIngreso"::DATE AS fecha_ingreso,
  COALESCE(
    rn."rango_id",
    (SELECT "rango_id" FROM "rango" WHERE "nombre" = 'SIN RANGO' LIMIT 1)
  ) AS rango_id,
  COALESCE(
    bn."bateria_id",
    (SELECT "bateria_id" FROM "bateria" WHERE "nombre" = 'SIN BATERIA' LIMIT 1)
  ) AS bateria_id,
  COALESCE(p."createdAt"::TIMESTAMPTZ, NOW()) AS created_at,
  COALESCE(p."updatedAt"::TIMESTAMPTZ, NOW()) AS updated_at
FROM "Personal" p
LEFT JOIN "Rango" ro ON ro."id" = p."rangoId"
LEFT JOIN "rango" rn ON rn."nombre" = ro."nombre"
LEFT JOIN "Bateria" bo ON bo."id" = p."bateriaId"
LEFT JOIN "bateria" bn ON bn."nombre" = bo."nombre"
ON CONFLICT ("ci") DO NOTHING;

-- 3) Personal tallas by type
CREATE TABLE "personal_talla" (
  "ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "talla_tipo_id" SMALLINT NOT NULL REFERENCES "talla_tipo"("talla_tipo_id"),
  "talla_valor" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("ci", "talla_tipo_id")
);

INSERT INTO "personal_talla" ("ci", "talla_tipo_id", "talla_valor", "updated_at")
SELECT
  p."cedulaIdentidad" AS ci,
  tt."talla_tipo_id",
  v."talla_valor",
  COALESCE(p."updatedAt"::TIMESTAMPTZ, NOW()) AS updated_at
FROM "Personal" p
JOIN "personal" pn ON pn."ci" = p."cedulaIdentidad"
JOIN LATERAL (
  VALUES
    ('PARKA', p."tallaParka"),
    ('CAMISACO', p."tallaCamisaco"),
    ('PANTALON', p."tallaPantalon"),
    ('KEPI', p."tallaKepi"),
    ('CALZADO', p."tallaCalzado")
) AS v("tipo", "talla_valor") ON TRUE
JOIN "talla_tipo" tt ON tt."nombre" = v."tipo"
WHERE v."talla_valor" IS NOT NULL AND TRIM(v."talla_valor") <> ''
ON CONFLICT ("ci", "talla_tipo_id")
DO UPDATE SET
  "talla_valor" = EXCLUDED."talla_valor",
  "updated_at" = EXCLUDED."updated_at";

-- 4) Registros header + detail
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_registro') THEN
    CREATE TYPE "tipo_registro" AS ENUM ('ENTREGA', 'DEVOLUCION', 'AJUSTE');
  END IF;
END $$;

CREATE TABLE "registro" (
  "registro_id" BIGSERIAL PRIMARY KEY,
  "ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "fecha" DATE NOT NULL,
  "tipo" "tipo_registro" NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "registro_ci_fecha_idx" ON "registro" ("ci", "fecha" DESC);

CREATE TABLE "registro_item" (
  "registro_id" BIGINT NOT NULL REFERENCES "registro"("registro_id") ON DELETE CASCADE,
  "item_id" BIGINT NOT NULL REFERENCES "item"("item_id"),
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("registro_id", "item_id")
);

CREATE INDEX "registro_item_item_id_idx" ON "registro_item"("item_id");

-- 5) Observaciones
CREATE TABLE "observacion" (
  "observacion_id" BIGSERIAL PRIMARY KEY,
  "ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE CASCADE,
  "fecha" DATE NOT NULL,
  "texto" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "observacion_ci_fecha_idx" ON "observacion" ("ci", "fecha" DESC);

-- Drop old denormalized tables
DROP TABLE IF EXISTS "Personal";
DROP TABLE IF EXISTS "Rango";
DROP TABLE IF EXISTS "Bateria";
