/*
  # Simplify user_profiles RLS to eliminate all recursion

  1. Problem
    - "Users can view org profiles" policy still causes recursion
    - Subquery on same table creates infinite loop
    
  2. Solution
    - Remove the problematic organization-based policy
    - Keep only the simplest policies that use auth.uid() directly
    - Organization viewing will be handled differently
    
  3. Security
    - Users can view and update their own profile only
    - Service role has full access
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view org profiles" ON user_profiles;

-- Ensure the simple policy exists
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());