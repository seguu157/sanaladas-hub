/*
  # Update Order Colors to Four Options

  1. Changes
    - Reset any colors that are not blue, green, red, or yellow to NULL
    - Update the color constraint to only allow: blue, green, red, yellow
    - Remove previous colors: purple, orange, pink, indigo, teal, cyan

  2. Security
    - Respects existing RLS policies
*/

-- First, reset colors that won't be valid under new constraint
UPDATE orders 
SET order_color = NULL 
WHERE order_color NOT IN ('blue', 'green', 'red', 'yellow');

-- Drop the old constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_color_check;

-- Add new constraint with only 4 colors
ALTER TABLE orders ADD CONSTRAINT orders_color_check 
  CHECK (order_color IS NULL OR order_color IN ('blue', 'green', 'red', 'yellow'));
