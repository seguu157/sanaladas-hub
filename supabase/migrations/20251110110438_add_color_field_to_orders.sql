/*
  # Añadir campo de color a pedidos

  1. Cambios
    - Añadir columna `color` a la tabla `orders`
    - Tipo: texto con valores permitidos: 'blue', 'green', 'red', 'yellow'
    - Valor por defecto: 'blue'
  
  2. Notas
    - Los colores se asignarán de forma rotativa en orden
    - Después del cuarto pedido, se repiten los colores
*/

-- Añadir columna color a la tabla orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'color'
  ) THEN
    ALTER TABLE orders ADD COLUMN color text DEFAULT 'blue' CHECK (color IN ('blue', 'green', 'red', 'yellow'));
  END IF;
END $$;