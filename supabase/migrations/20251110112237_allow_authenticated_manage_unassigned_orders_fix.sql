/*
  # Permitir a usuarios autenticados gestionar pedidos sin asignar

  1. Cambios
    - Actualizar política SELECT para incluir pedidos sin user_id
    - Actualizar política UPDATE para incluir pedidos sin user_id
    - Actualizar política DELETE para incluir pedidos sin user_id
  
  2. Seguridad
    - Solo usuarios autenticados pueden acceder a pedidos
    - Incluye tanto pedidos propios como no asignados
*/

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

-- Recrear política de SELECT para incluir pedidos sin user_id
CREATE POLICY "Authenticated users can view own and unassigned orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Recrear política de UPDATE para incluir pedidos sin user_id
CREATE POLICY "Authenticated users can update own and unassigned orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Recrear política de DELETE para incluir pedidos sin user_id
CREATE POLICY "Authenticated users can delete own and unassigned orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);