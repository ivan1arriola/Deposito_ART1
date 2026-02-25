DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE "user_role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
  END IF;
END $$;

CREATE TABLE "usuario" (
  "usuario_id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "rol" "user_role" NOT NULL DEFAULT 'VIEWER',
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE "sesion" (
  "sesion_id" TEXT PRIMARY KEY,
  "token_hash" TEXT NOT NULL UNIQUE,
  "usuario_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
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
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at" DESC);
CREATE INDEX "auditoria_usuario_id_created_at_idx" ON "auditoria"("usuario_id", "created_at" DESC);
