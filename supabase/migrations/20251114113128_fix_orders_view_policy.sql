/*
  # Fix Orders View Policy

  ## Changes
  Add policy to allow authenticated users to view unassigned orders (user_id IS NULL)
  
  ## Security Notes
  - Authenticated users can view their own orders
  - Authenticated users can view unassigned orders (user_id IS NULL)
  - This allows the application to function properly while maintaining security
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Create a more permissive policy for authenticated users
CREATE POLICY "Authenticated users can view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR user_id IS NULL
  );
