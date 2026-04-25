/*
  # Permitir creación de pedidos via webhook sin autenticación

  1. Cambios
    - Actualizar políticas RLS de orders, order_products, order_tableware y meal_times
    - Permitir INSERT desde funciones serverless sin usuario autenticado
    - Mantener restricciones para SELECT, UPDATE, DELETE

  2. Seguridad
    - Solo INSERT es público (para webhooks de N8N)
    - Lectura/modificación sigue requiriendo autenticación
*/

-- Eliminar políticas INSERT existentes
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can create order products" ON order_products;
DROP POLICY IF EXISTS "Users can create order tableware" ON order_tableware;
DROP POLICY IF EXISTS "Users can create meal times" ON meal_times;

-- Nuevas políticas INSERT que permiten creación anónima (para webhooks)
CREATE POLICY "Allow webhook order creation"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow webhook product creation"
  ON order_products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow webhook tableware creation"
  ON order_tableware FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow webhook meal times creation"
  ON meal_times FOR INSERT
  WITH CHECK (true);

-- Las políticas de SELECT, UPDATE, DELETE se mantienen intactas
-- (solo usuarios autenticados pueden leer/modificar)
