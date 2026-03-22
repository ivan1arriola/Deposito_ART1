ALTER TABLE "estanteria" DROP CONSTRAINT IF EXISTS "estanteria_codigo_formato_chk";
ALTER TABLE "caja" DROP CONSTRAINT IF EXISTS "caja_estanteria_formato_chk";

ALTER TABLE "estanteria" ALTER COLUMN "codigo" TYPE VARCHAR(1);
ALTER TABLE "caja" ALTER COLUMN "estanteria" TYPE VARCHAR(1);

ALTER TABLE "estanteria"
  ADD CONSTRAINT "estanteria_codigo_formato_chk"
  CHECK ("codigo" ~ '^[A-Z]$');

ALTER TABLE "caja"
  ADD CONSTRAINT "caja_estanteria_formato_chk"
  CHECK ("estanteria" ~ '^[A-Z]$');
