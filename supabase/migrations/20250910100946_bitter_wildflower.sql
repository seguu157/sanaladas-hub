/*
  # Crear tabla de conversaciones de IA

  1. Nueva Tabla
    - `ai_conversations`
      - `id` (uuid, primary key)
      - `client_name` (text)
      - `client_id` (text, unique)
      - `last_message` (text)
      - `last_activity` (timestamptz)
      - `created_at` (timestamptz)
      - `user_id` (uuid, foreign key)

  2. Seguridad
    - Habilitar RLS en tabla `ai_conversations`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_id text UNIQUE NOT NULL,
  last_message text DEFAULT '',
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view their own conversations"
  ON ai_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON ai_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON ai_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON ai_conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_conversations_client_id ON ai_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_activity ON ai_conversations(last_activity);

-- Función para actualizar last_activity automáticamente
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar last_activity
CREATE TRIGGER update_ai_conversations_activity 
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW 
  EXECUTE FUNCTION update_conversation_activity();