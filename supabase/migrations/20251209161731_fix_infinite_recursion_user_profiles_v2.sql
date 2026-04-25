/*
  # Fix infinite recursion in user_profiles RLS

  1. Problema
    - La política "Users can view organization users" causa recursión infinita
    - Hace SELECT en user_profiles mientras evalúa política de user_profiles
    
  2. Solución
    - Eliminar la política problemática
    - Crear función SECURITY DEFINER en schema public
    - Crear nueva política usando esa función
    
  3. Seguridad
    - La función solo retorna organization_id del usuario actual
    - La política permite ver usuarios de la misma organización
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view organization users" ON user_profiles;

-- Create a function that bypasses RLS to get current user's organization_id
CREATE OR REPLACE FUNCTION get_current_user_org_id()
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_org_id() TO authenticated;

-- Create new policy using the safe function
CREATE POLICY "Users can view organization users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IS NOT NULL 
    AND organization_id = get_current_user_org_id()
  );
