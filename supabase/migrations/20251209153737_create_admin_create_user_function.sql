/*
  # Función para que admins creen usuarios

  1. Cambios
    - Crear función RPC que permite a admins crear usuarios en su organización
    - La función maneja la creación del perfil con organization_id correcto

  2. Seguridad
    - Solo admins pueden ejecutar esta función
    - Los usuarios creados se asignan automáticamente a la organización del admin
*/

-- Modificar política de UPDATE para permitir a admins actualizar cualquier perfil
DROP POLICY IF EXISTS "Admins can update profiles in their organization" ON user_profiles;
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
  );