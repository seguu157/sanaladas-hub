/*
  # Permitir a usuarios autenticados gestionar pedidos sin asignar

  ## Problema
  Los usuarios autenticados pueden ver pedidos sin asignar (user_id = null),
  pero no pueden actualizarlos ni eliminarlos debido a políticas RLS restrictivas.

  ## Solución
  Agregar políticas que permitan a cualquier usuario autenticado:
  1. Actualizar pedidos sin asignar
  2. Eliminar pedidos sin asignar
  3. Asignarse pedidos sin asignar

  ## Cambios
  1. Nueva política de UPDATE para pedidos sin asignar
  2. Nueva política de DELETE para pedidos sin asignar
*/

-- Política para actualizar pedidos sin asignar
CREATE POLICY "Authenticated users can update unassigned orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Política para eliminar pedidos sin asignar
CREATE POLICY "Authenticated users can delete unassigned orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (user_id IS NULL);
