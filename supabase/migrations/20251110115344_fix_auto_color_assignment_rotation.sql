/*
  # Corregir rotación automática de colores

  1. Cambios
    - Mejorar función de asignación de colores
    - Usar conteo total en lugar de conteo diario
    - Asegurar que cada pedido consecutivo tenga color diferente

  2. Lógica
    - Cuenta TODOS los pedidos existentes
    - Usa módulo 4 para rotar entre los 4 colores
    - Cada nuevo pedido tendrá el siguiente color en la secuencia
*/

-- Recrear función con lógica mejorada
CREATE OR REPLACE FUNCTION assign_order_color()
RETURNS TRIGGER AS $$
DECLARE
  total_orders INTEGER;
  colors TEXT[] := ARRAY['blue', 'green', 'yellow', 'red'];
  color_index INTEGER;
BEGIN
  -- Si ya tiene color asignado manualmente, respetarlo
  IF NEW.color IS NOT NULL AND NEW.color != 'blue' THEN
    RETURN NEW;
  END IF;

  -- Contar TODOS los pedidos existentes
  SELECT COUNT(*)
  INTO total_orders
  FROM orders;

  -- Calcular índice de color (0-3) basado en el conteo total
  color_index := (total_orders % 4) + 1;

  -- Asignar color
  NEW.color := colors[color_index];

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
