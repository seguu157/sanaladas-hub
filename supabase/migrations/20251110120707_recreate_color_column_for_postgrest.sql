/*
  # Recrear columna color para forzar reconocimiento de PostgREST

  1. Cambios
    - Eliminar y recrear la columna color
    - Mantener los datos existentes
    - Forzar actualización del schema cache

  2. Seguridad
    - Guardar valores existentes temporalmente
    - Restaurar datos después de recrear columna
*/

-- Paso 1: Guardar valores existentes en otra columna temporal
ALTER TABLE orders ADD COLUMN IF NOT EXISTS color_backup text;
UPDATE orders SET color_backup = color WHERE color IS NOT NULL;

-- Paso 2: Eliminar columna color
ALTER TABLE orders DROP COLUMN IF EXISTS color;

-- Paso 3: Recrear columna color desde cero
ALTER TABLE orders ADD COLUMN color text NOT NULL DEFAULT 'blue';

-- Paso 4: Agregar restricción CHECK
ALTER TABLE orders ADD CONSTRAINT orders_color_check_new 
  CHECK (color IN ('blue', 'green', 'yellow', 'red'));

-- Paso 5: Restaurar valores
UPDATE orders SET color = color_backup WHERE color_backup IS NOT NULL;

-- Paso 6: Eliminar columna temporal
ALTER TABLE orders DROP COLUMN IF EXISTS color_backup;

-- Paso 7: Agregar comentario
COMMENT ON COLUMN orders.color IS 'Order identification color: blue, green, yellow, red';

-- Paso 8: Forzar recarga de PostgREST múltiples veces
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('pgrst', 'reload config');
SELECT pg_notify('pgrst', 'reload schema');
