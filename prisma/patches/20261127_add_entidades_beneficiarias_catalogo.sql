-- Parche idempotente (#18): catálogo administrable de entidades beneficiarias y precarga de 34 entidades internas.
CREATE TABLE IF NOT EXISTS "entidad_beneficiaria" (
  "entidad_beneficiaria_id" SMALLSERIAL PRIMARY KEY,
  "clase" VARCHAR(16) NOT NULL,
  "nombre" TEXT NOT NULL,
  "nombre_normalizado" TEXT NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "entidad_beneficiaria_clase_chk" CHECK ("clase" IN ('INTERNO', 'EXTERNO')),
  CONSTRAINT "entidad_beneficiaria_nombre_chk" CHECK (btrim("nombre") <> ''),
  CONSTRAINT "entidad_beneficiaria_clase_nombre_uq" UNIQUE ("clase", "nombre_normalizado")
);

CREATE INDEX IF NOT EXISTS "entidad_beneficiaria_clase_activo_idx"
  ON "entidad_beneficiaria"("clase", "activo");

INSERT INTO "entidad_beneficiaria" ("clase", "nombre", "nombre_normalizado", "activo")
VALUES
  ('INTERNO', 'Batería Comando', 'bateria comando', TRUE),
  ('INTERNO', 'Batería A', 'bateria a', TRUE),
  ('INTERNO', 'Batería B', 'bateria b', TRUE),
  ('INTERNO', 'PAM', 'pam', TRUE),
  ('INTERNO', 'Alojamiento de Señores Oficiales', 'alojamiento de senores oficiales', TRUE),
  ('INTERNO', 'Guardia de Prevención', 'guardia de prevencion', TRUE),
  ('INTERNO', 'Despacho de Capitán Batería A', 'despacho de capitan bateria a', TRUE),
  ('INTERNO', 'Despacho de Capitán Batería B', 'despacho de capitan bateria b', TRUE),
  ('INTERNO', 'Despacho de Capitán Batería Comando', 'despacho de capitan bateria comando', TRUE),
  ('INTERNO', 'S1', 's1', TRUE),
  ('INTERNO', 'S2', 's2', TRUE),
  ('INTERNO', 'S3', 's3', TRUE),
  ('INTERNO', 'S4', 's4', TRUE),
  ('INTERNO', 'S5', 's5', TRUE),
  ('INTERNO', 'S6', 's6', TRUE),
  ('INTERNO', 'Batería CIR', 'bateria cir', TRUE),
  ('INTERNO', 'Habilitación', 'habilitacion', TRUE),
  ('INTERNO', 'Perrera', 'perrera', TRUE),
  ('INTERNO', 'Administración', 'administracion', TRUE),
  ('INTERNO', 'Rancho', 'rancho', TRUE),
  ('INTERNO', 'Despacho Batería A', 'despacho bateria a', TRUE),
  ('INTERNO', 'Despacho de Batería B', 'despacho de bateria b', TRUE),
  ('INTERNO', 'Despacho Batería Comando', 'despacho bateria comando', TRUE),
  ('INTERNO', 'Casino de Señores Oficiales', 'casino de senores oficiales', TRUE),
  ('INTERNO', 'Enfermería', 'enfermeria', TRUE),
  ('INTERNO', 'Alojamiento Femenino', 'alojamiento femenino', TRUE),
  ('INTERNO', 'Caballeriza', 'caballeriza', TRUE),
  ('INTERNO', 'Casino de Suboficiales', 'casino de suboficiales', TRUE),
  ('INTERNO', 'Guarnición', 'guarnicion', TRUE),
  ('INTERNO', 'Taller', 'taller', TRUE),
  ('INTERNO', 'Lavandería', 'lavanderia', TRUE),
  ('INTERNO', 'Carpintería', 'carpinteria', TRUE),
  ('INTERNO', 'Herrería', 'herreria', TRUE),
  ('INTERNO', 'Depósito de UTH', 'deposito de uth', TRUE)
ON CONFLICT ("clase", "nombre_normalizado") DO NOTHING;
