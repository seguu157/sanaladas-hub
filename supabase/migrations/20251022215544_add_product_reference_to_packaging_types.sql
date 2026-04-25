/*
  # Add product reference field to packaging types

  ## Overview
  Adds a product_reference field to the packaging_types table to allow users
  to associate a product reference or code with each packaging type.

  ## Changes

  1. Table Modifications
    - Add `product_reference` column to `packaging_types`
      - Type: text (nullable)
      - Description: Optional product reference, SKU, or code for the packaging type
*/

-- Add product_reference column to packaging_types table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packaging_types' AND column_name = 'product_reference'
  ) THEN
    ALTER TABLE packaging_types ADD COLUMN product_reference text DEFAULT '';
  END IF;
END $$;
