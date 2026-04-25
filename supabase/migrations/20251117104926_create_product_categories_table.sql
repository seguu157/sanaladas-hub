/*
  # Create Product Categories Table

  1. New Tables
    - `product_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name
      - `bg_color` (text) - Tailwind background class (e.g., 'bg-blue-100')
      - `text_color` (text) - Tailwind text class (e.g., 'text-blue-800')
      - `border_color` (text) - Tailwind border class (e.g., 'border-blue-300')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `product_categories` table
    - Add policy for authenticated users to read all categories
    - Add policy for authenticated users to insert new categories
    - Add policy for authenticated users to update categories

  3. Initial Data
    - Seed with predefined categories from the existing code
*/

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  bg_color text NOT NULL,
  text_color text NOT NULL,
  border_color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all categories"
  ON product_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON product_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON product_categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed predefined categories
INSERT INTO product_categories (name, bg_color, text_color, border_color) VALUES
  ('Platos', 'bg-blue-100', 'text-blue-800', 'border-blue-300'),
  ('Sandwiches', 'bg-orange-100', 'text-orange-800', 'border-orange-300'),
  ('Wraps', 'bg-green-100', 'text-green-800', 'border-green-300'),
  ('Bolleria', 'bg-amber-100', 'text-amber-800', 'border-amber-300'),
  ('Postres', 'bg-pink-100', 'text-pink-800', 'border-pink-300'),
  ('Bebidas', 'bg-cyan-100', 'text-cyan-800', 'border-cyan-300'),
  ('General', 'bg-slate-100', 'text-slate-800', 'border-slate-300'),
  ('Ensaladas', 'bg-emerald-100', 'text-emerald-800', 'border-emerald-300'),
  ('Sopas', 'bg-rose-100', 'text-rose-800', 'border-rose-300'),
  ('Snacks', 'bg-yellow-100', 'text-yellow-800', 'border-yellow-300'),
  ('Extras', 'bg-violet-100', 'text-violet-800', 'border-violet-300'),
  ('Complementos', 'bg-teal-100', 'text-teal-800', 'border-teal-300')
ON CONFLICT (name) DO NOTHING;