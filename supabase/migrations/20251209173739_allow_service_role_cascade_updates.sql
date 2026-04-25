/*
  # Allow service role to perform cascade updates on user deletion

  1. Problem
    - RLS policies block automatic CASCADE/SET NULL updates when users are deleted
    - The Admin API uses service_role to delete users
    - Foreign key updates fail because service_role doesn't have explicit policies
    
  2. Solution
    - Add service_role policies to all tables with foreign keys to auth.users
    - This allows automatic updates when users are deleted
    
  3. Tables affected
    - order_products (completed_by)
    - order_tableware (completed_by)
    - completion_tracking (completed_by)
    - recipes (created_by)
    - orders (assigned_to)
    
  4. Security
    - Service role already has full access via Supabase Admin API
    - These policies just make it explicit for RLS
*/

-- Allow service_role to update order_products
DROP POLICY IF EXISTS "Service role can update order_products" ON order_products;
CREATE POLICY "Service role can update order_products"
  ON order_products
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete order_products" ON order_products;
CREATE POLICY "Service role can delete order_products"
  ON order_products
  FOR DELETE
  TO service_role
  USING (true);

-- Allow service_role to update order_tableware
DROP POLICY IF EXISTS "Service role can update order_tableware" ON order_tableware;
CREATE POLICY "Service role can update order_tableware"
  ON order_tableware
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete order_tableware" ON order_tableware;
CREATE POLICY "Service role can delete order_tableware"
  ON order_tableware
  FOR DELETE
  TO service_role
  USING (true);

-- Allow service_role to update completion_tracking
DROP POLICY IF EXISTS "Service role can update completion_tracking" ON completion_tracking;
CREATE POLICY "Service role can update completion_tracking"
  ON completion_tracking
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete completion_tracking" ON completion_tracking;
CREATE POLICY "Service role can delete completion_tracking"
  ON completion_tracking
  FOR DELETE
  TO service_role
  USING (true);

-- Allow service_role to update recipes
DROP POLICY IF EXISTS "Service role can update recipes" ON recipes;
CREATE POLICY "Service role can update recipes"
  ON recipes
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete recipes" ON recipes;
CREATE POLICY "Service role can delete recipes"
  ON recipes
  FOR DELETE
  TO service_role
  USING (true);

-- Allow service_role to update orders (for assigned_to field)
DROP POLICY IF EXISTS "Service role can update orders" ON orders;
CREATE POLICY "Service role can update orders"
  ON orders
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can delete orders" ON orders;
CREATE POLICY "Service role can delete orders"
  ON orders
  FOR DELETE
  TO service_role
  USING (true);
