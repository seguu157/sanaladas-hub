/*
  # Create Order Progress Tracking Table

  1. New Tables
    - `order_progress`
      - `id` (uuid, primary key)
      - `order_id` (text, references orders)
      - `item_type` (text: 'product' or 'tableware')
      - `item_name` (text: name of the product or tableware item)
      - `is_completed` (boolean: whether the item is checked/completed)
      - `has_allergy` (boolean: whether the product has allergy marker)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `order_progress` table
    - Add policies for authenticated users to manage their order progress

  3. Indexes
    - Add index on order_id for faster queries
    - Add composite unique index on (order_id, item_type, item_name) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS order_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('product', 'tableware')),
  item_name text NOT NULL,
  is_completed boolean DEFAULT false,
  has_allergy boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all order progress"
  ON order_progress
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert order progress"
  ON order_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order progress"
  ON order_progress
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order progress"
  ON order_progress
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_order_progress_order_id ON order_progress(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_progress_unique_item 
  ON order_progress(order_id, item_type, item_name);