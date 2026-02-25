-- Keep fallback rows only if they are referenced by migrated records.
DELETE FROM "rango" r
WHERE r."nombre" = 'SIN RANGO'
  AND NOT EXISTS (
    SELECT 1 FROM "personal" p WHERE p."rango_id" = r."rango_id"
  );

DELETE FROM "bateria" b
WHERE b."nombre" = 'SIN BATERIA'
  AND NOT EXISTS (
    SELECT 1 FROM "personal" p WHERE p."bateria_id" = b."bateria_id"
  );
