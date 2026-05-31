-- 1. Drop trigger checking for partitions on personal, subalterno, oficial, suboficial
DROP TRIGGER IF EXISTS "personal_partition_personal_chk" ON "personal";
DROP TRIGGER IF EXISTS "personal_partition_subalterno_chk" ON "subalterno";
DROP TRIGGER IF EXISTS "personal_partition_oficial_chk" ON "oficial";
DROP TRIGGER IF EXISTS "personal_partition_suboficial_chk" ON "suboficial";

-- Drop triggers for subtype matching
DROP TRIGGER IF EXISTS "subalterno_tipo_match_trg" ON "subalterno";
DROP TRIGGER IF EXISTS "oficial_tipo_match_trg" ON "oficial";
DROP TRIGGER IF EXISTS "suboficial_tipo_match_trg" ON "suboficial";

-- Also drop functions
DROP FUNCTION IF EXISTS public.validate_personal_partition_trigger();
DROP FUNCTION IF EXISTS public.assert_personal_partition(text);
DROP FUNCTION IF EXISTS public.enforce_subtable_tipo_match();

-- 2. Add columns to personal
ALTER TABLE "personal" ADD COLUMN "tipo" "tipo_personal";
ALTER TABLE "personal" ADD COLUMN "es_reingreso" boolean;
ALTER TABLE "personal" ADD COLUMN "fecha_ingreso" date;
ALTER TABLE "personal" ADD COLUMN "fecha_ingreso_original" date;
ALTER TABLE "personal" ADD COLUMN "bateria_id" smallint;

-- 3. Update 'tipo' in 'personal' using 'grado' table
UPDATE "personal" p
SET "tipo" = g."tipo"
FROM "grado" g
WHERE p."grado_id" = g."grado_id";

ALTER TABLE "personal" ALTER COLUMN "tipo" SET NOT NULL;

-- 4. Update fields for subalterno
UPDATE "personal" p
SET 
  "es_reingreso" = s."es_reingreso",
  "fecha_ingreso" = s."fecha_ingreso",
  "fecha_ingreso_original" = s."fecha_ingreso_original",
  "bateria_id" = s."bateria_id"
FROM "subalterno" s
WHERE p."ci" = s."ci";

-- 5. Add constraints to personal
ALTER TABLE "personal" DROP CONSTRAINT IF EXISTS "personal_grado_id_fkey";

ALTER TABLE "personal"
  ADD CONSTRAINT "personal_grado_id_tipo_fkey" FOREIGN KEY ("grado_id", "tipo") REFERENCES "grado"("grado_id", "tipo");

ALTER TABLE "personal" 
  ADD CONSTRAINT "personal_bateria_id_fkey" FOREIGN KEY ("bateria_id") REFERENCES "bateria"("bateria_id") ON DELETE SET NULL;

ALTER TABLE "personal"
  ADD CONSTRAINT "chk_personal_subalterno_fields" 
  CHECK (
    ("tipo" = 'SUBALTERNO') 
    OR 
    ("es_reingreso" IS NULL AND "fecha_ingreso" IS NULL AND "fecha_ingreso_original" IS NULL AND "bateria_id" IS NULL)
  );

ALTER TABLE "personal"
  ADD CONSTRAINT "chk_personal_reingreso_rules1" 
  CHECK (
    ("tipo" != 'SUBALTERNO') OR ("es_reingreso" IS NULL) OR ("es_reingreso" = false) OR ("fecha_ingreso" IS NOT NULL)
  );

ALTER TABLE "personal"
  ADD CONSTRAINT "chk_personal_reingreso_rules2" 
  CHECK (
    ("tipo" != 'SUBALTERNO') OR ("es_reingreso" IS NULL) OR ("es_reingreso" = true) OR ("fecha_ingreso_original" IS NULL)
  );

ALTER TABLE "personal"
  ADD CONSTRAINT "chk_personal_fechas_orden"
  CHECK ("fecha_ingreso_original" IS NULL OR "fecha_ingreso" IS NULL OR "fecha_ingreso_original" <= "fecha_ingreso");

ALTER TABLE "personal"
  ADD CONSTRAINT "chk_personal_fechas_futuras1"
  CHECK ("fecha_ingreso" IS NULL OR "fecha_ingreso" <= CURRENT_DATE);

ALTER TABLE "personal"
  ADD CONSTRAINT "chk_personal_fechas_futuras2"
  CHECK ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= CURRENT_DATE);

-- 6. Drop the tables
DROP TABLE "subalterno";
DROP TABLE "oficial";
DROP TABLE "suboficial";
