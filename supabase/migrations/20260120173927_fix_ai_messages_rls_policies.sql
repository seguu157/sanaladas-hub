/*
  # Fix AI Messages RLS Policies

  1. Security
    - Drop existing overly permissive policies on ai_messages
    - Create proper policies that filter by conversation ownership
    - Users can only access messages from their own conversations
    
  2. Changes
    - SELECT policy: Check that conversation belongs to user
    - INSERT policy: Check that conversation belongs to user
    - UPDATE policy: Check that conversation belongs to user  
    - DELETE policy: Check that conversation belongs to user
    
  3. Performance
    - These policies will use the existing index on conversation_id
    - Queries will be much faster by filtering at the RLS level
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to view messages" ON ai_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON ai_messages;
DROP POLICY IF EXISTS "Allow authenticated users to update messages" ON ai_messages;
DROP POLICY IF EXISTS "Allow authenticated users to delete messages" ON ai_messages;

-- Create proper RLS policies that filter by conversation ownership
CREATE POLICY "Users can view messages from their conversations"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their conversations"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their conversations"
  ON ai_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their conversations"
  ON ai_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Create index to optimize the RLS policy lookups
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id 
  ON ai_conversations(user_id);
