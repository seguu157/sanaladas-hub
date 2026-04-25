/*
  # Crear tabla de comentarios de pedidos

  1. Nueva Tabla
    - `order_comments`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `text` (text)
      - `created_at` (timestamptz)
      - `user_id` (uuid, foreign key)

  2. Seguridad
    - Habilitar RLS en tabla `order_comments`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS order_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE order_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view comments on their orders"
  ON order_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_comments.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert comments on their orders"
  ON order_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_comments.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON order_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON order_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_comments_order_id ON order_comments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_comments_user_id ON order_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_order_comments_created_at ON order_comments(created_at);