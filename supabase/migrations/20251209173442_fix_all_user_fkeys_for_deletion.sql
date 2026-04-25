/*
  # Fix all foreign keys to auth.users to allow user deletion

  1. Problem
    - Multiple tables have foreign keys to auth.users with NO ACTION
    - This prevents users from being deleted
    - Tables affected:
      - order_products.completed_by
      - order_tableware.completed_by
      - completion_tracking.completed_by
      - recipes.created_by
      - orders.assigned_to
    
  2. Solution
    - Change all these constraints to ON DELETE SET NULL
    - When a user is deleted, these fields will be set to NULL
    - This maintains data integrity while allowing user deletion
    
  3. Security
    - No security impact
    - Users can still only be deleted by admins via Edge Function
*/

-- Fix order_products.completed_by
ALTER TABLE order_products 
  DROP CONSTRAINT IF EXISTS order_products_completed_by_fkey;

ALTER TABLE order_products 
  ADD CONSTRAINT order_products_completed_by_fkey 
  FOREIGN KEY (completed_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Fix order_tableware.completed_by
ALTER TABLE order_tableware 
  DROP CONSTRAINT IF EXISTS order_tableware_completed_by_fkey;

ALTER TABLE order_tableware 
  ADD CONSTRAINT order_tableware_completed_by_fkey 
  FOREIGN KEY (completed_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Fix completion_tracking.completed_by
ALTER TABLE completion_tracking 
  DROP CONSTRAINT IF EXISTS completion_tracking_completed_by_fkey;

ALTER TABLE completion_tracking 
  ADD CONSTRAINT completion_tracking_completed_by_fkey 
  FOREIGN KEY (completed_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Fix recipes.created_by
ALTER TABLE recipes 
  DROP CONSTRAINT IF EXISTS recipes_created_by_fkey;

ALTER TABLE recipes 
  ADD CONSTRAINT recipes_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Fix orders.assigned_to
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_assigned_to_fkey;

ALTER TABLE orders 
  ADD CONSTRAINT orders_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;
