CREATE TABLE IF NOT EXISTS "usuario_recordatorio_config" (
  "usuario_id" TEXT PRIMARY KEY REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "mostrar_muneco" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "usuario_recordatorio_tarea" (
  "tarea_id" BIGSERIAL PRIMARY KEY,
  "usuario_id" TEXT NOT NULL REFERENCES "usuario"("usuario_id") ON DELETE CASCADE,
  "titulo" TEXT NOT NULL,
  "nota" TEXT,
  "fecha_limite" DATE,
  "completada" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "usuario_recordatorio_tarea_usuario_completada_fecha_idx"
  ON "usuario_recordatorio_tarea"("usuario_id", "completada", "fecha_limite");
