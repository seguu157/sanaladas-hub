/*
  # Crear tabla de productos por pedido

  1. Nueva Tabla
    - `order_products`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `product_name` (text)
      - `category` (text)
      - `quantity` (integer)
      - `format` (text)
      - `size` (text)
      - `packaging` (text)
      - `is_completed` (boolean)
      - `completed_by` (uuid, foreign key)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Seguridad
    - Habilitar RLS en tabla `order_products`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS order_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  format text DEFAULT '',
  size text DEFAULT '',
  packaging text NOT NULL DEFAULT '',
  is_completed boolean DEFAULT false,
  completed_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE order_products ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view products on their orders"
  ON order_products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_products.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert products on their orders"
  ON order_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_products.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products on their orders"
  ON order_products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_products.order_id 
      AND orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_products.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products on their orders"
  ON order_products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_products.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_products_order_id ON order_products(order_id);
CREATE INDEX IF NOT EXISTS idx_order_products_category ON order_products(category);
CREATE INDEX IF NOT EXISTS idx_order_products_is_completed ON order_products(is_completed);
CREATE INDEX IF NOT EXISTS idx_order_products_completed_by ON order_products(completed_by);

-- Función para actualizar completed_at cuando is_completed cambia a true
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_completed = true AND OLD.is_completed = false THEN
        NEW.completed_at = now();
        NEW.completed_by = auth.uid();
    ELSIF NEW.is_completed = false THEN
        NEW.completed_at = NULL;
        NEW.completed_by = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar completed_at
CREATE TRIGGER update_order_products_completed_at 
  BEFORE UPDATE ON order_products
  FOR EACH ROW 
  EXECUTE FUNCTION update_completed_at();