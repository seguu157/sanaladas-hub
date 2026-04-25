/*
  # Create order_packaging table

  1. New Tables
    - `order_packaging`
      - `id` (uuid, primary key)
      - `order_id` (text, references the order)
      - `product_name` (text, name of the product)
      - `packaging_type_id` (uuid, references packaging_types)
      - `quantity` (integer, quantity of this packaging type)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `order_packaging` table
    - Add policy for authenticated users to read all order packaging
    - Add policy for authenticated users to insert order packaging
    - Add policy for authenticated users to update order packaging
    - Add policy for authenticated users to delete order packaging

  3. Indexes
    - Index on order_id for fast lookups by order
    - Index on packaging_type_id for fast lookups by packaging type
*/

CREATE TABLE IF NOT EXISTS order_packaging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  product_name text NOT NULL,
  packaging_type_id uuid NOT NULL REFERENCES packaging_types(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_packaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all order packaging"
  ON order_packaging
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert order packaging"
  ON order_packaging
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order packaging"
  ON order_packaging
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order packaging"
  ON order_packaging
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_order_packaging_order_id ON order_packaging(order_id);
CREATE INDEX IF NOT EXISTS idx_order_packaging_type_id ON order_packaging(packaging_type_id);