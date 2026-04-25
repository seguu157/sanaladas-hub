/*
  # Agregar campo assigned_to a orders

  1. Modificaciones
    - Agregar campo `assigned_to` a la tabla `orders`
      - Referencia a `auth.users(id)`
      - Permite asignar pedidos a workers específicos
    
  2. Índices
    - Crear índice en `assigned_to` para mejorar rendimiento de queries

  3. Seguridad
    - No se modifican políticas RLS existentes
*/

-- Agregar campo assigned_to a orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE orders ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);