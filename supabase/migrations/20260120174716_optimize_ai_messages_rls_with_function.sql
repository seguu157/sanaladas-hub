/*
  # Optimize AI Messages RLS with Helper Function

  1. Problem
    - The RLS policy on ai_messages uses a subquery that can be slow
    - The subquery runs for EVERY row being accessed
    
  2. Solution
    - Create a security definer function to get user's conversation IDs
    - This function caches the result and runs with elevated privileges
    - Much faster than running subquery per row
    
  3. Changes
    - Create helper function get_user_conversation_ids()
    - Update RLS policies to use the helper function
    - Add index optimization hint
*/

-- Create a security definer function to get user's conversation IDs efficiently
CREATE OR REPLACE FUNCTION get_user_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM ai_conversations WHERE user_id = auth.uid();
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON ai_messages;
DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON ai_messages;

-- Create optimized policies using the helper function
CREATE POLICY "Users can view own conversation messages"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (conversation_id IN (SELECT get_user_conversation_ids()));

CREATE POLICY "Users can insert to own conversations"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (conversation_id IN (SELECT get_user_conversation_ids()));

CREATE POLICY "Users can update own conversation messages"
  ON ai_messages FOR UPDATE
  TO authenticated
  USING (conversation_id IN (SELECT get_user_conversation_ids()))
  WITH CHECK (conversation_id IN (SELECT get_user_conversation_ids()));

CREATE POLICY "Users can delete own conversation messages"
  ON ai_messages FOR DELETE
  TO authenticated
  USING (conversation_id IN (SELECT get_user_conversation_ids()));
