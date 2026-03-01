ALTER TABLE "personal"
  ADD COLUMN IF NOT EXISTS "telefono_contacto" TEXT;

ALTER TABLE "personal"
  DROP CONSTRAINT IF EXISTS "personal_telefono_contacto_uy_chk";

ALTER TABLE "personal"
  ADD CONSTRAINT "personal_telefono_contacto_uy_chk"
  CHECK ("telefono_contacto" IS NULL OR "telefono_contacto" ~ '^09[0-9]{7}$');
