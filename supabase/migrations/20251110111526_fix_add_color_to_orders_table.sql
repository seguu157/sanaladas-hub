/*
  # Añadir campo color a tabla orders (fix)

  1. Cambios
    - Eliminar restricción si existe
    - Eliminar columna color si existe
    - Añadir columna color con valores permitidos
    - Asignar colores a pedidos existentes
  
  2. Notas
    - Los colores rotan: blue, green, red, yellow
    - Se asignan colores a todos los pedidos existentes
*/

-- Eliminar restricción si existe
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_color_check;

-- Eliminar columna si existe
ALTER TABLE orders DROP COLUMN IF EXISTS color;

-- Añadir columna color
ALTER TABLE orders 
ADD COLUMN color text NOT NULL DEFAULT 'blue';

-- Añadir restricción
ALTER TABLE orders 
ADD CONSTRAINT orders_color_check 
CHECK (color IN ('blue', 'green', 'red', 'yellow'));

-- Asignar colores rotativos a pedidos existentes
DO $$
DECLARE
  order_record RECORD;
  color_index INTEGER := 0;
  colors TEXT[] := ARRAY['blue', 'green', 'red', 'yellow'];
BEGIN
  FOR order_record IN 
    SELECT id FROM orders ORDER BY created_at ASC
  LOOP
    UPDATE orders 
    SET color = colors[(color_index % 4) + 1]
    WHERE id = order_record.id;
    
    color_index := color_index + 1;
  END LOOP;
END $$;