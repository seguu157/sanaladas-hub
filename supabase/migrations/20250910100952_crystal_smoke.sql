/*
  # Crear tabla de mensajes de IA

  1. Nueva Tabla
    - `ai_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `text` (text)
      - `sender` (text) - user o ai
      - `created_at` (timestamptz)

  2. Seguridad
    - Habilitar RLS en tabla `ai_messages`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE,
  text text NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user', 'ai')),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view messages in their conversations"
  ON ai_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their conversations"
  ON ai_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their conversations"
  ON ai_messages
  FOR UPDATE
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

CREATE POLICY "Users can delete messages in their conversations"
  ON ai_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations 
      WHERE ai_conversations.id = ai_messages.conversation_id 
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_sender ON ai_messages(sender);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- Función para actualizar last_message en conversación
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ai_conversations 
        SET last_message = CASE 
            WHEN length(NEW.text) > 50 THEN substring(NEW.text from 1 for 50) || '...'
            ELSE NEW.text
        END,
        last_activity = now()
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Actualizar con el último mensaje restante
        UPDATE ai_conversations 
        SET last_message = COALESCE(
            (SELECT CASE 
                WHEN length(text) > 50 THEN substring(text from 1 for 50) || '...'
                ELSE text
            END
            FROM ai_messages 
            WHERE conversation_id = OLD.conversation_id 
            ORDER BY created_at DESC 
            LIMIT 1), 
            ''
        ),
        last_activity = now()
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers para actualizar last_message
CREATE TRIGGER update_conversation_on_message_insert
  AFTER INSERT ON ai_messages
  FOR EACH ROW 
  EXECUTE FUNCTION update_conversation_last_message();

CREATE TRIGGER update_conversation_on_message_delete
  AFTER DELETE ON ai_messages
  FOR EACH ROW 
  EXECUTE FUNCTION update_conversation_last_message();