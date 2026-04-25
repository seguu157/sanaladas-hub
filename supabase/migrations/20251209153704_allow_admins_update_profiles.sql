/*
  # Permitir a admins actualizar perfiles de su organización

  1. Cambios
    - Agregar política para que admins puedan actualizar perfiles de usuarios en su organización
    - Esto permite que los admins asignen organization_id, roles, etc.

  2. Seguridad
    - Solo admins pueden actualizar otros perfiles
    - Solo pueden actualizar perfiles de su propia organización
*/

-- Política para que admins puedan actualizar perfiles de su organización
CREATE POLICY "Admins can update profiles in their organization"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND up.organization_id = user_profiles.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND up.organization_id = user_profiles.organization_id
    )
  );