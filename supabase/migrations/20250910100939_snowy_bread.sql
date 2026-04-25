/*
  # Crear tabla de horarios de comidas

  1. Nueva Tabla
    - `meal_times`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `meal_type` (text) - breakfast, lunch, dinner
      - `preparation_time` (time)
      - `travel_time` (text)
      - `delivery_time` (time)
      - `delivery_responsible` (text)
      - `created_at` (timestamptz)

  2. Seguridad
    - Habilitar RLS en tabla `meal_times`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS meal_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  preparation_time time NOT NULL,
  travel_time text DEFAULT '',
  delivery_time time NOT NULL,
  delivery_responsible text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE meal_times ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view meal times on their orders"
  ON meal_times
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = meal_times.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meal times on their orders"
  ON meal_times
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = meal_times.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meal times on their orders"
  ON meal_times
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = meal_times.order_id 
      AND orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = meal_times.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meal times on their orders"
  ON meal_times
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = meal_times.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_meal_times_order_id ON meal_times(order_id);
CREATE INDEX IF NOT EXISTS idx_meal_times_meal_type ON meal_times(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_times_delivery_time ON meal_times(delivery_time);

-- Constraint para evitar duplicados de meal_type por order
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_times_order_meal_unique 
  ON meal_times(order_id, meal_type);