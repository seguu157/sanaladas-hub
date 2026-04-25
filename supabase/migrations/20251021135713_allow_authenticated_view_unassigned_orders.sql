/*
  # Permitir a usuarios autenticados ver pedidos sin asignar

  ## Problema
  Los pedidos creados via webhook tienen `user_id = null` y no son visibles
  para los usuarios autenticados debido a las políticas RLS restrictivas.

  ## Solución
  Agregar una política que permita a cualquier usuario autenticado ver
  pedidos que no tienen `user_id` asignado (pedidos de webhook).

  ## Cambios
  1. Nueva política de SELECT para pedidos sin asignar
     - Permite a usuarios autenticados (`authenticated` role)
     - Solo para pedidos donde `user_id IS NULL`
     - Útil para pedidos creados via webhooks públicos
*/

-- Política para permitir ver pedidos sin asignar
CREATE POLICY "Authenticated users can view unassigned orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL);
