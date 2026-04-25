/*
  # Crear tabla de seguimiento de completado

  1. Nueva Tabla
    - `completion_tracking`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `item_type` (text) - product o tableware
      - `item_name` (text)
      - `item_key` (text) - clave única para localStorage
      - `is_completed` (boolean)
      - `completed_by` (uuid, foreign key)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Seguridad
    - Habilitar RLS en tabla `completion_tracking`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS completion_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('product', 'tableware')),
  item_name text NOT NULL,
  item_key text NOT NULL, -- Para sincronizar con localStorage
  is_completed boolean DEFAULT false,
  completed_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE completion_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view completion tracking on their orders"
  ON completion_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = completion_tracking.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert completion tracking on their orders"
  ON completion_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = completion_tracking.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update completion tracking on their orders"
  ON completion_tracking
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = completion_tracking.order_id 
      AND orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = completion_tracking.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete completion tracking on their orders"
  ON completion_tracking
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = completion_tracking.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_completion_tracking_order_id ON completion_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_completion_tracking_item_type ON completion_tracking(item_type);
CREATE INDEX IF NOT EXISTS idx_completion_tracking_item_key ON completion_tracking(item_key);
CREATE INDEX IF NOT EXISTS idx_completion_tracking_is_completed ON completion_tracking(is_completed);
CREATE INDEX IF NOT EXISTS idx_completion_tracking_completed_by ON completion_tracking(completed_by);

-- Constraint para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_completion_tracking_unique 
  ON completion_tracking(order_id, item_key);

-- Trigger para actualizar completed_at y completed_by
CREATE TRIGGER update_completion_tracking_completed_at 
  BEFORE UPDATE ON completion_tracking
  FOR EACH ROW 
  EXECUTE FUNCTION update_completed_at();