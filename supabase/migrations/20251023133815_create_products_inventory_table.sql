/*
  # Create Products Inventory Table

  1. New Tables
    - `products_inventory`
      - `id` (uuid, primary key)
      - `supplier_name` (text) - Nombre del proveedor
      - `product_reference` (text) - Referencia del producto
      - `product_name` (text) - Nombre del producto
      - `tax` (text) - Tipo de impuesto
      - `format_name` (text) - Nombre del formato (tamaño, unidad, etc)
      - `price` (decimal) - Precio del producto
      - `warehouse_units` (integer) - Unidades en almacén
      - `needs_purchase` (boolean) - Si el producto necesita ser comprado
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `products_inventory` table
    - Add policies for authenticated users to manage their products
*/

CREATE TABLE IF NOT EXISTS products_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name text NOT NULL,
  product_reference text NOT NULL,
  product_name text NOT NULL,
  tax text DEFAULT '',
  format_name text DEFAULT '',
  price decimal(10,2) DEFAULT 0,
  warehouse_units integer DEFAULT 0,
  needs_purchase boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all products"
  ON products_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own products"
  ON products_inventory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own products"
  ON products_inventory FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own products"
  ON products_inventory FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_inventory_created_by ON products_inventory(created_by);
CREATE INDEX IF NOT EXISTS idx_products_inventory_needs_purchase ON products_inventory(needs_purchase);
