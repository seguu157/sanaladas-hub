/*
  # Crear tabla de vajilla por pedido

  1. Nueva Tabla
    - `order_tableware`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `item_name` (text)
      - `quantity` (integer)
      - `is_completed` (boolean)
      - `completed_by` (uuid, foreign key)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Seguridad
    - Habilitar RLS en tabla `order_tableware`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS order_tableware (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE order_tableware ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view tableware on their orders"
  ON order_tableware
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_tableware.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tableware on their orders"
  ON order_tableware
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_tableware.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tableware on their orders"
  ON order_tableware
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_tableware.order_id 
      AND orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_tableware.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tableware on their orders"
  ON order_tableware
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_tableware.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_tableware_order_id ON order_tableware(order_id);
CREATE INDEX IF NOT EXISTS idx_order_tableware_item_name ON order_tableware(item_name);
CREATE INDEX IF NOT EXISTS idx_order_tableware_is_completed ON order_tableware(is_completed);
CREATE INDEX IF NOT EXISTS idx_order_tableware_completed_by ON order_tableware(completed_by);

-- Trigger para actualizar completed_at
CREATE TRIGGER update_order_tableware_completed_at 
  BEFORE UPDATE ON order_tableware
  FOR EACH ROW 
  EXECUTE FUNCTION update_completed_at();