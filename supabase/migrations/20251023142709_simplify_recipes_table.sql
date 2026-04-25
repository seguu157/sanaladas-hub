/*
  # Simplify Recipes Table Structure

  1. Changes
    - Drop existing recipes table
    - Create new simplified recipes table with fields:
      - `id` (uuid, primary key)
      - `nombre_receta` (text) - Recipe name
      - `es_subreceta` (boolean) - Is it a sub-recipe (Yes/No)
      - `unidad_subreceta` (text) - Sub-recipe unit
      - `cantidad_subreceta` (numeric) - Sub-recipe quantity
      - `ingrediente` (text) - Ingredient name
      - `cantidad_ingrediente` (numeric) - Ingredient quantity
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp
      - `created_by` (uuid) - User who created the recipe

  2. Security
    - Enable RLS on `recipes` table
    - Add policies for authenticated users to manage recipes
*/

-- Drop existing table
DROP TABLE IF EXISTS recipes CASCADE;

-- Create simplified recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_receta text NOT NULL,
  es_subreceta boolean DEFAULT false,
  unidad_subreceta text DEFAULT '',
  cantidad_subreceta numeric DEFAULT 0,
  ingrediente text DEFAULT '',
  cantidad_ingrediente numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all recipes"
  ON recipes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert recipes"
  ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update recipes"
  ON recipes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete recipes"
  ON recipes
  FOR DELETE
  TO authenticated
  USING (true);