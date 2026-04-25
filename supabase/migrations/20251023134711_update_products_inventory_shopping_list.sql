/*
  # Update Products Inventory for Shopping List

  1. Changes to `products_inventory` table
    - Remove `warehouse_units` column
    - Remove `needs_purchase` column
    
  2. New Table `shopping_list`
    - `id` (uuid, primary key)
    - `product_id` (uuid, foreign key to products_inventory)
    - `units_remaining` (integer) - Unidades que quedan
    - `units_to_buy` (integer) - Cuántas comprar
    - `is_purchased` (boolean) - Si ya se compró
    - `created_by` (uuid, foreign key to auth.users)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on `shopping_list` table
    - Add policies for authenticated users
*/

-- Remove columns from products_inventory
ALTER TABLE products_inventory DROP COLUMN IF EXISTS warehouse_units;
ALTER TABLE products_inventory DROP COLUMN IF EXISTS needs_purchase;

-- Create shopping_list table
CREATE TABLE IF NOT EXISTS shopping_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products_inventory(id) ON DELETE CASCADE NOT NULL,
  units_remaining integer DEFAULT 0,
  units_to_buy integer DEFAULT 0,
  is_purchased boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopping list"
  ON shopping_list FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own shopping list items"
  ON shopping_list FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own shopping list items"
  ON shopping_list FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own shopping list items"
  ON shopping_list FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopping_list_product_id ON shopping_list(product_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_created_by ON shopping_list(created_by);
CREATE INDEX IF NOT EXISTS idx_shopping_list_is_purchased ON shopping_list(is_purchased);
