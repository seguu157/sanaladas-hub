/*
  # Create Recipes Table

  1. New Tables
    - `recipes`
      - `id` (uuid, primary key)
      - `centro_coste` (text) - Cost center
      - `referencia_receta` (text) - Recipe reference
      - `nombre_receta` (text) - Recipe name
      - `categoria` (text) - Category
      - `familia` (text) - Family
      - `activo` (boolean) - Active status
      - `subreceta` (text) - Sub-recipe
      - `unidad_subreceta` (text) - Sub-recipe unit
      - `cantidad_subreceta` (numeric) - Sub-recipe quantity
      - `referencia_ingrediente_desde_receta` (text) - Ingredient reference from recipe
      - `referencia_ingrediente_desde_producto` (text) - Ingredient reference from product
      - `nombre_ingrediente` (text) - Ingredient name
      - `ctd_neta_ingrediente` (numeric) - Net ingredient quantity
      - `ctd_merma_automatica_ingrediente` (numeric) - Automatic waste quantity
      - `sku` (text) - SKU
      - `fecha_inicio` (date) - Start date
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp
      - `created_by` (uuid) - User who created the recipe

  2. Security
    - Enable RLS on `recipes` table
    - Add policy for authenticated users to view all recipes
    - Add policy for authenticated users to insert recipes
    - Add policy for authenticated users to update recipes
    - Add policy for authenticated users to delete recipes
*/

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_coste text DEFAULT '',
  referencia_receta text DEFAULT '',
  nombre_receta text NOT NULL,
  categoria text DEFAULT '',
  familia text DEFAULT '',
  activo boolean DEFAULT true,
  subreceta text DEFAULT '',
  unidad_subreceta text DEFAULT '',
  cantidad_subreceta numeric DEFAULT 0,
  referencia_ingrediente_desde_receta text DEFAULT '',
  referencia_ingrediente_desde_producto text DEFAULT '',
  nombre_ingrediente text DEFAULT '',
  ctd_neta_ingrediente numeric DEFAULT 0,
  ctd_merma_automatica_ingrediente numeric DEFAULT 0,
  sku text DEFAULT '',
  fecha_inicio date DEFAULT CURRENT_DATE,
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