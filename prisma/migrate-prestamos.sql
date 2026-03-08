DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prestamo_destinatario_tipo') THEN
    CREATE TYPE "prestamo_destinatario_tipo" AS ENUM ('PERSONAL', 'OFICIAL_SUBOFICIAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "prestamo" (
  "prestamo_id" BIGSERIAL PRIMARY KEY,
  "recibo_numero" TEXT NOT NULL UNIQUE,
  "destinatario_tipo" "prestamo_destinatario_tipo" NOT NULL,
  "destinatario_personal_ci" TEXT REFERENCES "personal"("ci"),
  "destinatario_oficial_suboficial_ci" TEXT REFERENCES "oficial_suboficial"("ci"),
  "usuario_entrega_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id"),
  "fecha_prestamo" DATE NOT NULL,
  "fecha_devolucion" DATE,
  "usuario_recibe_devolucion_id" TEXT REFERENCES "usuario"("usuario_id"),
  "comentarios" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

ALTER TABLE "prestamo"
  ADD COLUMN IF NOT EXISTS "recibo_numero" TEXT,
  ADD COLUMN IF NOT EXISTS "destinatario_tipo" "prestamo_destinatario_tipo",
  ADD COLUMN IF NOT EXISTS "destinatario_personal_ci" TEXT,
  ADD COLUMN IF NOT EXISTS "destinatario_oficial_suboficial_ci" TEXT,
  ADD COLUMN IF NOT EXISTS "usuario_entrega_id" TEXT,
  ADD COLUMN IF NOT EXISTS "fecha_prestamo" DATE,
  ADD COLUMN IF NOT EXISTS "fecha_devolucion" DATE,
  ADD COLUMN IF NOT EXISTS "usuario_recibe_devolucion_id" TEXT,
  ADD COLUMN IF NOT EXISTS "comentarios" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6);

ALTER TABLE "prestamo"
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prestamo_destinatario_chk'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_destinatario_chk"
      CHECK (
        (
          "destinatario_tipo" = 'PERSONAL'
          AND "destinatario_personal_ci" IS NOT NULL
          AND "destinatario_oficial_suboficial_ci" IS NULL
        )
        OR (
          "destinatario_tipo" = 'OFICIAL_SUBOFICIAL'
          AND "destinatario_personal_ci" IS NULL
          AND "destinatario_oficial_suboficial_ci" IS NOT NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prestamo_devolucion_chk'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_devolucion_chk"
      CHECK (
        ("fecha_devolucion" IS NULL AND "usuario_recibe_devolucion_id" IS NULL)
        OR ("fecha_devolucion" IS NOT NULL AND "usuario_recibe_devolucion_id" IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prestamo_fecha_rango_chk'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_fecha_rango_chk"
      CHECK ("fecha_devolucion" IS NULL OR "fecha_devolucion" >= "fecha_prestamo");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prestamo_fecha_prestamo_hoy_chk'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_fecha_prestamo_hoy_chk"
      CHECK ("fecha_prestamo" <= CURRENT_DATE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prestamo_fecha_devolucion_hoy_chk'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_fecha_devolucion_hoy_chk"
      CHECK ("fecha_devolucion" IS NULL OR "fecha_devolucion" <= CURRENT_DATE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_destinatario_personal_ci_fkey'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_destinatario_personal_ci_fkey"
      FOREIGN KEY ("destinatario_personal_ci") REFERENCES "personal"("ci");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_destinatario_oficial_suboficial_ci_fkey'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_destinatario_oficial_suboficial_ci_fkey"
      FOREIGN KEY ("destinatario_oficial_suboficial_ci") REFERENCES "oficial_suboficial"("ci");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_usuario_entrega_id_fkey'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_usuario_entrega_id_fkey"
      FOREIGN KEY ("usuario_entrega_id") REFERENCES "usuario"("usuario_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamo_usuario_recibe_devolucion_id_fkey'
  ) THEN
    ALTER TABLE "prestamo"
      ADD CONSTRAINT "prestamo_usuario_recibe_devolucion_id_fkey"
      FOREIGN KEY ("usuario_recibe_devolucion_id") REFERENCES "usuario"("usuario_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "prestamo_destinatario_tipo_fecha_prestamo_idx" ON "prestamo"("destinatario_tipo", "fecha_prestamo" DESC);
CREATE INDEX IF NOT EXISTS "prestamo_destinatario_personal_ci_idx" ON "prestamo"("destinatario_personal_ci");
CREATE INDEX IF NOT EXISTS "prestamo_destinatario_oficial_suboficial_ci_idx" ON "prestamo"("destinatario_oficial_suboficial_ci");
CREATE INDEX IF NOT EXISTS "prestamo_usuario_entrega_id_idx" ON "prestamo"("usuario_entrega_id");
CREATE INDEX IF NOT EXISTS "prestamo_usuario_recibe_devolucion_id_idx" ON "prestamo"("usuario_recibe_devolucion_id");
CREATE INDEX IF NOT EXISTS "prestamo_fecha_prestamo_idx" ON "prestamo"("fecha_prestamo" DESC);
CREATE INDEX IF NOT EXISTS "prestamo_fecha_devolucion_idx" ON "prestamo"("fecha_devolucion" DESC);

CREATE TABLE IF NOT EXISTS "prestamo_item" (
  "prestamo_id" BIGINT NOT NULL REFERENCES "prestamo"("prestamo_id") ON DELETE CASCADE,
  "item_id" BIGINT NOT NULL REFERENCES "item"("item_id"),
  "cantidad" INTEGER NOT NULL CHECK ("cantidad" > 0),
  PRIMARY KEY ("prestamo_id", "item_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prestamo_item_cantidad_chk'
  ) THEN
    ALTER TABLE "prestamo_item"
      ADD CONSTRAINT "prestamo_item_cantidad_chk"
      CHECK ("cantidad" > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "prestamo_item_item_id_idx" ON "prestamo_item"("item_id");
