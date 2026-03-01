ALTER TABLE grado
ADD COLUMN IF NOT EXISTS orden SMALLINT;

WITH grado_ordenado AS (
  SELECT
    grado_id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN lower(abreviacion) LIKE 'sgto%' THEN 1
          WHEN lower(abreviacion) LIKE 'cabo 1%' THEN 2
          WHEN lower(abreviacion) LIKE 'cabo 2%' THEN 3
          WHEN lower(abreviacion) LIKE 'sdo 1%' THEN 4
          ELSE 99
        END,
        abreviacion,
        grado_id
    ) AS orden
  FROM grado
)
UPDATE grado
SET orden = grado_ordenado.orden
FROM grado_ordenado
WHERE grado.grado_id = grado_ordenado.grado_id;

ALTER TABLE grado
ALTER COLUMN orden SET NOT NULL;

CREATE INDEX IF NOT EXISTS grado_orden_idx ON grado (orden);

ALTER TABLE bateria
ADD COLUMN IF NOT EXISTS orden SMALLINT;

WITH bateria_ordenada AS (
  SELECT
    bateria_id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN nombre IN ('S/ CIRR', 'Cursando CIRR') THEN 1
          ELSE 0
        END,
        nombre,
        bateria_id
    ) AS orden
  FROM bateria
)
UPDATE bateria
SET orden = bateria_ordenada.orden
FROM bateria_ordenada
WHERE bateria.bateria_id = bateria_ordenada.bateria_id;

ALTER TABLE bateria
ALTER COLUMN orden SET NOT NULL;

CREATE INDEX IF NOT EXISTS bateria_orden_idx ON bateria (orden);
