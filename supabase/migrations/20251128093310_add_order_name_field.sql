/*
  # Add order_name field to orders table

  1. Changes
    - Add `order_name` column to `orders` table
      - Type: text (nullable)
      - Allows users to set custom names for orders
      - Defaults to null (will use client name as fallback in UI)
  
  2. Purpose
    - Enable users to give custom, memorable names to orders
    - Improves order identification and organization
    - Optional field - existing orders work without it

  3. Notes
    - No default value - UI will show client name if order_name is null
    - Fully compatible with existing orders
*/

-- Add order_name column to orders table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_name text;
    
    -- Add index for faster searches by order name
    CREATE INDEX IF NOT EXISTS idx_orders_order_name ON orders(order_name);
  END IF;
END $$;