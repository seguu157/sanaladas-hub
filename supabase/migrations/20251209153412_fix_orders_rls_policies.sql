/*
  # Corregir políticas RLS para orders

  1. Cambios
    - Eliminar todas las políticas antiguas que filtran por user_id
    - Mantener solo las políticas basadas en organization_id
    - Asegurar que los usuarios vean los pedidos de su organización

  2. Seguridad
    - Usuarios autenticados ven pedidos de su organización
    - Pedidos sin organización son visibles (para compatibilidad)
    - Webhooks anónimos pueden crear pedidos
*/

-- Eliminar todas las políticas antiguas de SELECT que usan user_id
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can manage unassigned orders" ON orders;

-- Eliminar políticas antiguas de UPDATE que usan user_id
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;

-- Eliminar políticas antiguas de DELETE que usan user_id
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

-- Eliminar políticas duplicadas de INSERT
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;

-- Asegurar que la política de SELECT por organización existe y es correcta
DROP POLICY IF EXISTS "Users can view orders from their organization" ON orders;
CREATE POLICY "Users can view orders from their organization"
  ON orders FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
    OR organization_id IS NULL
  );