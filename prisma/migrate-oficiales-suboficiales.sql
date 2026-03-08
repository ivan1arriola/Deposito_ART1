DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_oficial_suboficial') THEN
    CREATE TYPE "tipo_oficial_suboficial" AS ENUM ('OFICIAL', 'SUBOFICIAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "grado_mando" (
  "grado_mando_id" SMALLSERIAL PRIMARY KEY,
  "abreviacion" TEXT NOT NULL UNIQUE,
  "nombre_completo" TEXT NOT NULL UNIQUE,
  "orden" SMALLINT NOT NULL
);

CREATE INDEX IF NOT EXISTS "grado_mando_orden_idx" ON "grado_mando"("orden");

CREATE TABLE IF NOT EXISTS "oficial_suboficial" (
  "ci" TEXT PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "apellido" TEXT NOT NULL,
  "grado_mando_id" SMALLINT NOT NULL REFERENCES "grado_mando"("grado_mando_id"),
  "tipo" "tipo_oficial_suboficial" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'oficial_suboficial_ci_uruguaya_valida_chk'
  ) THEN
    ALTER TABLE "oficial_suboficial"
      ADD CONSTRAINT "oficial_suboficial_ci_uruguaya_valida_chk"
      CHECK (public.es_ci_uruguaya_valida("ci"));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "oficial_suboficial_grado_mando_id_idx" ON "oficial_suboficial"("grado_mando_id");
CREATE INDEX IF NOT EXISTS "oficial_suboficial_tipo_idx" ON "oficial_suboficial"("tipo");

CREATE TABLE IF NOT EXISTS "oficial_suboficial_talla" (
  "ci" TEXT NOT NULL REFERENCES "oficial_suboficial"("ci") ON DELETE CASCADE,
  "talla_tipo_id" SMALLINT NOT NULL REFERENCES "talla_tipo"("talla_tipo_id"),
  "talla_valor" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  PRIMARY KEY ("ci", "talla_tipo_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'oficial_suboficial_talla_valor_permitido_chk'
  ) THEN
    ALTER TABLE "oficial_suboficial_talla"
      ADD CONSTRAINT "oficial_suboficial_talla_valor_permitido_chk"
      CHECK (
        ("talla_tipo_id" IN (1, 2, 3) AND "talla_valor" IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'))
        OR ("talla_tipo_id" = 4 AND "talla_valor" IN ('54', '55', '56', '57', '58', '59', '60', '61', '62', '63'))
        OR ("talla_tipo_id" = 5 AND "talla_valor" IN ('34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'))
      );
  END IF;
END $$;
