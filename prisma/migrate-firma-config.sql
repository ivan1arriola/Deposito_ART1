-- Migración: Refactorizar config_firma para separar texto institucional de datos de firmantes
-- Fecha: 2026-02-26

-- Paso 1: Agregar las nuevas columnas
ALTER TABLE config_firma 
ADD COLUMN IF NOT EXISTS encargado_rango TEXT,
ADD COLUMN IF NOT EXISTS encargado_nombre TEXT,
ADD COLUMN IF NOT EXISTS oficial_rango TEXT,
ADD COLUMN IF NOT EXISTS oficial_nombre TEXT;

-- Paso 2: Migrar datos existentes (establecer valores por defecto)
UPDATE config_firma 
SET 
  encargado_rango = 'Sgto.',
  encargado_nombre = 'Wilson Lara',
  oficial_rango = '-Tte.2º',
  oficial_nombre = 'Gerardo Otero'
WHERE id = 1;

-- Paso 3: Hacer las nuevas columnas obligatorias
ALTER TABLE config_firma 
ALTER COLUMN encargado_rango SET NOT NULL,
ALTER COLUMN encargado_nombre SET NOT NULL,
ALTER COLUMN oficial_rango SET NOT NULL,
ALTER COLUMN oficial_nombre SET NOT NULL;

-- Paso 4: Eliminar las columnas antiguas
ALTER TABLE config_firma 
DROP COLUMN IF EXISTS encargado_texto,
DROP COLUMN IF EXISTS oficial_texto;

-- Verificar el resultado
SELECT * FROM config_firma;
