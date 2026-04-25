/*
  # Agregar soporte para múltiples colores en pedidos

  1. Cambios
    - Añadir campo `order_colors` de tipo array de texto para permitir múltiples colores
    - Migrar datos existentes de `order_color` a `order_colors`
    - Mantener `order_color` por compatibilidad con el código existente

  2. Notas
    - Cuando hay más de 4 pedidos, se duplican los colores (ej: rojo-rojo, verde-verde)
    - El array `order_colors` almacenará múltiples valores como ['red', 'red'] para indicar dos círculos rojos
*/

-- Agregar el campo order_colors como array de texto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_colors'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_colors text[] DEFAULT NULL;
  END IF;
END $$;

-- Migrar datos existentes: convertir order_color en un array de un elemento
UPDATE orders
SET order_colors = ARRAY[order_color]
WHERE order_color IS NOT NULL AND order_colors IS NULL;

-- Crear índice para búsquedas en el array
CREATE INDEX IF NOT EXISTS idx_orders_order_colors ON orders USING GIN (order_colors);