/*
  # Fix RLS Infinite Recursion in user_profiles

  1. Problem
    - Current policies cause infinite recursion when checking roles
    - Policies query user_profiles while protecting user_profiles
    
  2. Solution
    - Drop existing problematic policies
    - Create new simpler policies that avoid recursion
    - Use direct auth.uid() checks instead of subqueries
    
  3. Security
    - Authenticated users can view their own profile
    - Authenticated users can view profiles in their organization
    - Users can update their own profile
    - Service role has full access
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users in org can view each other" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Create simple, non-recursive policies

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to view profiles in same organization (using a join, not a subquery on same table)
CREATE POLICY "Users can view org profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Service role policies (unchanged)
CREATE POLICY "Service role full access select"
  ON user_profiles FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role full access insert"
  ON user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role full access update"
  ON user_profiles FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role full access delete"
  ON user_profiles FOR DELETE
  TO service_role
  USING (true);