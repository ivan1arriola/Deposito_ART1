WITH desired AS (
  SELECT *
  FROM (
    VALUES
      ('OFICIAL'::"tipo_personal", 1::SMALLINT, 'Tte. Cnel.'::TEXT, 'Teniente Coronel'::TEXT),
      ('OFICIAL'::"tipo_personal", 2::SMALLINT, 'May.'::TEXT, 'Mayor'::TEXT),
      ('OFICIAL'::"tipo_personal", 3::SMALLINT, 'Cap.'::TEXT, U&'Capit\00E1n'::TEXT),
      ('OFICIAL'::"tipo_personal", 4::SMALLINT, U&'Tte. 1\00B0'::TEXT, 'Teniente Primero'::TEXT),
      ('OFICIAL'::"tipo_personal", 5::SMALLINT, U&'Tte. 2\00B0'::TEXT, 'Teniente Segundo'::TEXT),
      ('OFICIAL'::"tipo_personal", 6::SMALLINT, 'Alf.'::TEXT, U&'Alf\00E9rez'::TEXT),
      ('SUBOFICIAL'::"tipo_personal", 1::SMALLINT, 'S.O.M'::TEXT, 'Sub Oficial Mayor'::TEXT),
      ('SUBOFICIAL'::"tipo_personal", 2::SMALLINT, U&'Sgto. 1\00B0'::TEXT, 'Sargento Primero'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 1::SMALLINT, 'Sgto.'::TEXT, 'Sargento'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 2::SMALLINT, U&'Cabo 1\00B0'::TEXT, 'Cabo de Primera'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 3::SMALLINT, U&'Cabo 2\00B0'::TEXT, 'Cabo de Segunda'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 4::SMALLINT, U&'Sdo. 1\00B0'::TEXT, 'Soldado de Primera'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 5::SMALLINT, U&'Sdo. 1\00B0 C/ CIRR'::TEXT, 'Soldado de Primera Cursando CIRR'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 6::SMALLINT, U&'Sdo. 1\00B0 S/ CIRR'::TEXT, 'Soldado de Primera Sin CIRR'::TEXT)
  ) AS t("tipo", "orden", "abreviacion", "nombre_completo")
)
UPDATE "grado" g
SET
  "abreviacion" = d."abreviacion",
  "nombre_completo" = d."nombre_completo",
  "orden" = d."orden"
FROM desired d
WHERE g."tipo" = d."tipo"
  AND g."orden" = d."orden";

WITH desired AS (
  SELECT *
  FROM (
    VALUES
      ('OFICIAL'::"tipo_personal", 1::SMALLINT, 'Tte. Cnel.'::TEXT, 'Teniente Coronel'::TEXT),
      ('OFICIAL'::"tipo_personal", 2::SMALLINT, 'May.'::TEXT, 'Mayor'::TEXT),
      ('OFICIAL'::"tipo_personal", 3::SMALLINT, 'Cap.'::TEXT, U&'Capit\00E1n'::TEXT),
      ('OFICIAL'::"tipo_personal", 4::SMALLINT, U&'Tte. 1\00B0'::TEXT, 'Teniente Primero'::TEXT),
      ('OFICIAL'::"tipo_personal", 5::SMALLINT, U&'Tte. 2\00B0'::TEXT, 'Teniente Segundo'::TEXT),
      ('OFICIAL'::"tipo_personal", 6::SMALLINT, 'Alf.'::TEXT, U&'Alf\00E9rez'::TEXT),
      ('SUBOFICIAL'::"tipo_personal", 1::SMALLINT, 'S.O.M'::TEXT, 'Sub Oficial Mayor'::TEXT),
      ('SUBOFICIAL'::"tipo_personal", 2::SMALLINT, U&'Sgto. 1\00B0'::TEXT, 'Sargento Primero'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 1::SMALLINT, 'Sgto.'::TEXT, 'Sargento'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 2::SMALLINT, U&'Cabo 1\00B0'::TEXT, 'Cabo de Primera'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 3::SMALLINT, U&'Cabo 2\00B0'::TEXT, 'Cabo de Segunda'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 4::SMALLINT, U&'Sdo. 1\00B0'::TEXT, 'Soldado de Primera'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 5::SMALLINT, U&'Sdo. 1\00B0 C/ CIRR'::TEXT, 'Soldado de Primera Cursando CIRR'::TEXT),
      ('SUBALTERNO'::"tipo_personal", 6::SMALLINT, U&'Sdo. 1\00B0 S/ CIRR'::TEXT, 'Soldado de Primera Sin CIRR'::TEXT)
  ) AS t("tipo", "orden", "abreviacion", "nombre_completo")
)
INSERT INTO "grado" ("tipo", "abreviacion", "nombre_completo", "orden")
SELECT d."tipo", d."abreviacion", d."nombre_completo", d."orden"
FROM desired d
WHERE NOT EXISTS (
  SELECT 1
  FROM "grado" g
  WHERE g."tipo" = d."tipo"
    AND g."orden" = d."orden"
);
