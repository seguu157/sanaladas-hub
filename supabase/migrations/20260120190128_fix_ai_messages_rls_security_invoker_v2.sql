/*
  # Fix AI Messages RLS - Change function to SECURITY INVOKER

  ## Problem
  The `get_user_conversation_ids()` function was using SECURITY DEFINER,
  which causes `auth.uid()` to return NULL because the function runs
  with the owner's permissions instead of the calling user's permissions.

  ## Solution
  1. Drop existing RLS policies that depend on the function
  2. Drop and recreate the function with SECURITY INVOKER
  3. Recreate the RLS policies

  ## Changes
  - Function now uses SECURITY INVOKER instead of SECURITY DEFINER
  - All four RLS policies are recreated with same logic
*/

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversation messages" ON ai_messages;
DROP POLICY IF EXISTS "Users can insert to own conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can update own conversation messages" ON ai_messages;
DROP POLICY IF EXISTS "Users can delete own conversation messages" ON ai_messages;

-- Step 2: Drop and recreate function with SECURITY INVOKER
DROP FUNCTION IF EXISTS get_user_conversation_ids();

CREATE FUNCTION get_user_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT id FROM ai_conversations WHERE user_id = auth.uid();
$$;

-- Step 3: Recreate RLS policies
CREATE POLICY "Users can view own conversation messages"
  ON ai_messages
  FOR SELECT
  TO authenticated
  USING (conversation_id IN (SELECT get_user_conversation_ids()));

CREATE POLICY "Users can insert to own conversations"
  ON ai_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (conversation_id IN (SELECT get_user_conversation_ids()));

CREATE POLICY "Users can update own conversation messages"
  ON ai_messages
  FOR UPDATE
  TO authenticated
  USING (conversation_id IN (SELECT get_user_conversation_ids()))
  WITH CHECK (conversation_id IN (SELECT get_user_conversation_ids()));

CREATE POLICY "Users can delete own conversation messages"
  ON ai_messages
  FOR DELETE
  TO authenticated
  USING (conversation_id IN (SELECT get_user_conversation_ids()));
