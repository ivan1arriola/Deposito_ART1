/* eslint-disable @typescript-eslint/no-require-imports -- legacy CommonJS migration scripts */
const fs = require('node:fs');
let content = fs.readFileSync('prisma/schema-base.sql', 'utf8');

// 1. Update personal table columns
const personalOld = `CREATE TABLE "personal" (
    "ci" text NOT NULL,
    "apellido1" text NOT NULL,
    "apellido2" text,
    "nombre1" text NOT NULL,
    "nombre2" text,
    "telefono_contacto" text,
    "grado_id" smallint NOT NULL,
    "baja" boolean DEFAULT false NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;
const personalNew = `CREATE TABLE "personal" (
    "ci" text NOT NULL,
    "apellido1" text NOT NULL,
    "apellido2" text,
    "nombre1" text NOT NULL,
    "nombre2" text,
    "telefono_contacto" text,
    "grado_id" smallint NOT NULL,
    "tipo" "tipo_personal" NOT NULL,
    "es_reingreso" boolean,
    "fecha_ingreso" date,
    "fecha_ingreso_original" date,
    "bateria_id" smallint,
    "baja" boolean DEFAULT false NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);`;
content = content.replace(personalOld, personalNew);

// 2. Remove Subtables
content = content.replace(/CREATE TABLE "subalterno" \([\s\S]*?\);\n\n?/, '');
content = content.replace(/CREATE TABLE "oficial" \([\s\S]*?\);\n\n?/, '');
content = content.replace(/CREATE TABLE "suboficial" \([\s\S]*?\);\n\n?/, '');

// 3. Remove triggers and functions
content = content.replace(/CREATE OR REPLACE FUNCTION public\.enforce_subtable_tipo_match\(\)[\s\S]*?\$\$;\n\n?/g, '');
content = content.replace(/CREATE TRIGGER "subalterno_tipo_match_trg"[\s\S]*?EXECUTE FUNCTION public\.enforce_subtable_tipo_match\(\);\n\n?/g, '');
content = content.replace(/CREATE TRIGGER "oficial_tipo_match_trg"[\s\S]*?EXECUTE FUNCTION public\.enforce_subtable_tipo_match\(\);\n\n?/g, '');
content = content.replace(/CREATE TRIGGER "suboficial_tipo_match_trg"[\s\S]*?EXECUTE FUNCTION public\.enforce_subtable_tipo_match\(\);\n\n?/g, '');
content = content.replace(/CREATE OR REPLACE FUNCTION public\.assert_personal_partition\(ci_text text\)[\s\S]*?\$\$;\n\n?/g, '');
content = content.replace(/CREATE OR REPLACE FUNCTION public\.validate_personal_partition_trigger\(\)[\s\S]*?\$\$;\n\n?/g, '');
content = content.replace(/CREATE CONSTRAINT TRIGGER "personal_partition_personal_chk"[\s\S]*?EXECUTE FUNCTION public\.validate_personal_partition_trigger\(\);\n\n?/g, '');
content = content.replace(/CREATE CONSTRAINT TRIGGER "personal_partition_subalterno_chk"[\s\S]*?EXECUTE FUNCTION public\.validate_personal_partition_trigger\(\);\n\n?/g, '');
content = content.replace(/CREATE CONSTRAINT TRIGGER "personal_partition_oficial_chk"[\s\S]*?EXECUTE FUNCTION public\.validate_personal_partition_trigger\(\);\n\n?/g, '');
content = content.replace(/CREATE CONSTRAINT TRIGGER "personal_partition_suboficial_chk"[\s\S]*?EXECUTE FUNCTION public\.validate_personal_partition_trigger\(\);\n\n?/g, '');

// 4. Constraints
// FKs to replace:
// "personal_grado_id_fkey" -> "personal_grado_id_tipo_fkey"
// Add battery FK and check constraints
content = content.replace(/ALTER TABLE ONLY "personal"\n    ADD CONSTRAINT "personal_grado_id_fkey" FOREIGN KEY \("grado_id"\) REFERENCES "grado"\("grado_id"\);/,
`ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "personal_grado_id_tipo_fkey" FOREIGN KEY ("grado_id", "tipo") REFERENCES "grado"("grado_id", "tipo");

ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "personal_bateria_id_fkey" FOREIGN KEY ("bateria_id") REFERENCES "bateria"("bateria_id") ON DELETE SET NULL;

ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "chk_personal_subalterno_fields" 
    CHECK (("tipo" = 'SUBALTERNO') OR ("es_reingreso" IS NULL AND "fecha_ingreso" IS NULL AND "fecha_ingreso_original" IS NULL AND "bateria_id" IS NULL));

ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "chk_personal_reingreso_rules1" 
    CHECK (("tipo" != 'SUBALTERNO') OR ("es_reingreso" IS NULL) OR ("es_reingreso" = false) OR ("fecha_ingreso" IS NOT NULL));

ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "chk_personal_reingreso_rules2" 
    CHECK (("tipo" != 'SUBALTERNO') OR ("es_reingreso" IS NULL) OR ("es_reingreso" = true) OR ("fecha_ingreso_original" IS NULL));

ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "chk_personal_fechas_orden"
    CHECK ("fecha_ingreso_original" IS NULL OR "fecha_ingreso" IS NULL OR "fecha_ingreso_original" <= "fecha_ingreso");

ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "chk_personal_fechas_futuras1"
    CHECK ("fecha_ingreso" IS NULL OR "fecha_ingreso" <= CURRENT_DATE);

ALTER TABLE ONLY "personal"
    ADD CONSTRAINT "chk_personal_fechas_futuras2"
    CHECK ("fecha_ingreso_original" IS NULL OR "fecha_ingreso_original" <= CURRENT_DATE);`);

// 5. Remove subtable FKs
content = content.replace(/ALTER TABLE ONLY "subalterno"\n    ADD CONSTRAINT "subalterno_bateria_id_fkey"[\s\S]*?;\n\n?/g, '');
content = content.replace(/ALTER TABLE ONLY "subalterno"\n    ADD CONSTRAINT "subalterno_ci_fkey"[\s\S]*?;\n\n?/g, '');
content = content.replace(/ALTER TABLE ONLY "oficial"\n    ADD CONSTRAINT "oficial_ci_fkey"[\s\S]*?;\n\n?/g, '');
content = content.replace(/ALTER TABLE ONLY "suboficial"\n    ADD CONSTRAINT "suboficial_ci_fkey"[\s\S]*?;\n\n?/g, '');

// PKs
content = content.replace(/ALTER TABLE ONLY "subalterno"\n    ADD CONSTRAINT "subalterno_pkey"[\s\S]*?;\n\n?/g, '');
content = content.replace(/ALTER TABLE ONLY "oficial"\n    ADD CONSTRAINT "oficial_pkey"[\s\S]*?;\n\n?/g, '');
content = content.replace(/ALTER TABLE ONLY "suboficial"\n    ADD CONSTRAINT "suboficial_pkey"[\s\S]*?;\n\n?/g, '');

fs.writeFileSync('prisma/schema-base.sql', content);
