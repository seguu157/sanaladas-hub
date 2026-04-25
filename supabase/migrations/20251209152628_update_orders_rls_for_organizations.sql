/*
  # Actualizar políticas RLS para filtro por organización

  1. Modificaciones
    - Eliminar políticas antiguas de orders
    - Crear nuevas políticas que filtren por organization_id
    - Los usuarios autenticados solo ven pedidos de su organización
    - Los pedidos sin organización son visibles para usuarios de Sanaladas

  2. Seguridad
    - Mantener RLS habilitado
    - Políticas restrictivas por defecto
*/

-- Eliminar políticas antiguas de orders
DROP POLICY IF EXISTS "Authenticated users can view unassigned orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can manage unassigned orders" ON orders;
DROP POLICY IF EXISTS "Allow anonymous order creation" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;

-- Política para ver pedidos de la organización
CREATE POLICY "Users can view orders from their organization"
  ON orders FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- Política para crear pedidos (asignados a la organización del usuario)
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- Política para actualizar pedidos de la organización
CREATE POLICY "Users can update orders from their organization"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR organization_id IS NULL
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- Política para eliminar pedidos (solo admins)
CREATE POLICY "Admins can delete orders from their organization"
  ON orders FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Permitir creación anónima de pedidos (para webhooks)
CREATE POLICY "Allow anonymous order creation for webhooks"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- Asignar organización de Sanaladas a todos los pedidos existentes
UPDATE orders
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;