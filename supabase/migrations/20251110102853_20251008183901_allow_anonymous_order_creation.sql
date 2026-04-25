/*
  # Permitir creación de pedidos via webhook sin autenticación

  1. Cambios
    - Actualizar políticas RLS de orders
    - Permitir INSERT desde funciones serverless sin usuario autenticado
    - Mantener restricciones para SELECT, UPDATE, DELETE

  2. Seguridad
    - Solo INSERT es público (para webhooks de N8N)
    - Lectura/modificación sigue requiriendo autenticación
*/

-- Eliminar política INSERT existente
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;

-- Nueva política INSERT que permite creación anónima (para webhooks)
CREATE POLICY "Allow webhook order creation"
  ON orders FOR INSERT
  WITH CHECK (true);