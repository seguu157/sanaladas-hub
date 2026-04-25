/*
  # Fix user_profiles.created_by foreign key for user deletion

  1. Problem
    - The created_by field has ON DELETE NO ACTION
    - This blocks user deletion if they created other users
    
  2. Solution
    - Change the constraint to ON DELETE SET NULL
    - This allows user deletion and sets created_by to NULL
    
  3. Security
    - Maintains referential integrity
    - Allows proper cascading when users are deleted
*/

-- Drop the existing constraint
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_created_by_fkey;

-- Recreate with SET NULL on delete
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
