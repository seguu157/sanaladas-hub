/*
  # Add AI Performance Indexes

  1. New Indexes
    - Add index on ai_conversations.user_id for faster user queries
    - Add index on ai_conversations.last_activity for faster sorting
    - Add index on ai_messages.conversation_id for faster message lookups
    - Add index on ai_messages.created_at for faster message ordering
    - Add composite index on ai_messages for optimal query performance

  2. Performance Impact
    - These indexes will dramatically speed up AI conversation and message loading
    - Especially beneficial when users have many conversations
    - Reduces query time from seconds to milliseconds
*/

-- AI Conversations indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id 
  ON ai_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_activity 
  ON ai_conversations(last_activity DESC);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_activity 
  ON ai_conversations(user_id, last_activity DESC);

-- AI Messages indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id 
  ON ai_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at 
  ON ai_messages(created_at);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created 
  ON ai_messages(conversation_id, created_at);
