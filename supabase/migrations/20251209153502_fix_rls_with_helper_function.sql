/*
  # Corregir RLS con función helper

  1. Cambios
    - Crear función helper para obtener organization_id del usuario actual
    - Simplificar políticas RLS usando esta función
    - Evitar problemas de subconsultas RLS en cascada

  2. Funciones
    - get_user_organization_id() - retorna organization_id del usuario actual
*/

-- Función para obtener el organization_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$;

-- Recrear política de SELECT para orders usando la función
DROP POLICY IF EXISTS "Users can view orders from their organization" ON orders;
CREATE POLICY "Users can view orders from their organization"
  ON orders FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
  );

-- Recrear política de UPDATE para orders usando la función
DROP POLICY IF EXISTS "Users can update orders from their organization" ON orders;
CREATE POLICY "Users can update orders from their organization"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    OR organization_id IS NULL
  );

-- Recrear política de DELETE para admins usando la función
DROP POLICY IF EXISTS "Admins can delete orders from their organization" ON orders;
CREATE POLICY "Admins can delete orders from their organization"
  ON orders FOR DELETE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );