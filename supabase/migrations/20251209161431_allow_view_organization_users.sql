/*
  # Permitir ver usuarios de la misma organización

  1. Problema
    - La política actual solo permite ver el propio perfil
    - No se pueden ver otros usuarios de la misma organización
    
  2. Solución
    - Crear una política que use una subquery lateral para evitar recursión
    - Permitir SELECT de usuarios con el mismo organization_id
    
  3. Seguridad
    - Los usuarios solo pueden ver perfiles de su misma organización
    - Se mantiene la restricción por organization_id
*/

-- Drop existing view policy if exists
DROP POLICY IF EXISTS "Users can view organization users" ON user_profiles;

-- Create new policy that allows viewing users from same organization
-- Using a lateral join to avoid recursion
CREATE POLICY "Users can view organization users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id = (
      SELECT up.organization_id 
      FROM auth.users u
      LEFT JOIN user_profiles up ON u.id = up.id
      WHERE u.id = auth.uid()
      LIMIT 1
    )
  );
