/*
  # Add order color field

  1. Changes
    - Add color column to orders table to assign visual identifiers
    - Color can be one of: blue, green, purple, orange, pink, indigo, red, yellow, teal, cyan
    - Default value is NULL (no color assigned)

  2. Security
    - Users can update their own order colors
*/

-- Add color column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_color TEXT;

-- Add check constraint for valid colors
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_color_check;
ALTER TABLE orders ADD CONSTRAINT orders_color_check 
  CHECK (order_color IS NULL OR order_color IN ('blue', 'green', 'purple', 'orange', 'pink', 'indigo', 'red', 'yellow', 'teal', 'cyan'));

-- Create index for faster color-based queries
CREATE INDEX IF NOT EXISTS idx_orders_color ON orders(order_color) WHERE order_color IS NOT NULL;