/*
  # Fix user_profiles foreign key to allow user deletion

  1. Problem
    - The `created_by` column references auth.users(id) without ON DELETE
    - This prevents users from being deleted from auth.users
    - Causes "Database error deleting user" when trying to delete users
    
  2. Solution
    - Drop the existing foreign key constraint
    - Recreate it with ON DELETE SET NULL
    - When a user is deleted, created_by will be set to NULL instead of blocking
    
  3. Security
    - No security impact - this is purely for referential integrity
    - Users can still only be deleted by admins via Edge Function
*/

-- Drop the existing constraint
DO $$
BEGIN
  -- Find and drop the constraint
  EXECUTE (
    SELECT 'ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS ' || constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%created_by%'
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Recreate the constraint with ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE user_profiles 
      ADD CONSTRAINT user_profiles_created_by_fkey 
      FOREIGN KEY (created_by) 
      REFERENCES auth.users(id) 
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
