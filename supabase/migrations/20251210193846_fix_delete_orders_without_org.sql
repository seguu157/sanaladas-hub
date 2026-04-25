/*
  # Permitir eliminar pedidos sin organization_id
  
  1. Problema
    - Los pedidos sin organization_id (pedidos antiguos) no se pueden eliminar
    - La política RLS actual solo permite eliminar pedidos con organization_id que coincida con el del usuario
    
  2. Solución
    - Actualizar la política DELETE para permitir que admins eliminen pedidos sin organization_id
    - Esto permite eliminar pedidos antiguos creados antes del sistema de organizaciones
*/

-- Recrear política de DELETE para permitir eliminar pedidos sin organization_id
DROP POLICY IF EXISTS "Admins can delete orders from their organization" ON orders;

CREATE POLICY "Admins can delete orders from their organization"
  ON orders FOR DELETE
  TO authenticated
  USING (
    (organization_id = get_user_organization_id() OR organization_id IS NULL)
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
