/*
  # Create packaging types table

  ## Overview
  This migration creates a table to store different packaging types that can be
  associated with products in orders. Users can create and manage packaging types
  in a library, then assign them to products during order processing.

  ## Changes

  1. New Tables
    - `packaging_types`
      - `id` (uuid, primary key) - Unique identifier for packaging type
      - `name` (text, not null) - Name of the packaging type (e.g., "Bandeja", "Botella")
      - `description` (text, nullable) - Optional description of the packaging
      - `created_at` (timestamptz) - When the packaging type was created
      - `updated_at` (timestamptz) - Last time the packaging type was updated
      - `created_by` (uuid, foreign key) - User who created this packaging type

  2. Security
    - Enable RLS on `packaging_types` table
    - Policy: Authenticated users can view all packaging types
    - Policy: Authenticated users can create packaging types
    - Policy: Authenticated users can update their own packaging types
    - Policy: Authenticated users can delete their own packaging types

  3. Indexes
    - Index on `name` for faster searches
    - Index on `created_by` for filtering user's packaging types
*/

-- Create packaging_types table
CREATE TABLE IF NOT EXISTS packaging_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packaging_types_name ON packaging_types(name);
CREATE INDEX IF NOT EXISTS idx_packaging_types_created_by ON packaging_types(created_by);

-- Enable Row Level Security
ALTER TABLE packaging_types ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view all packaging types
CREATE POLICY "Authenticated users can view all packaging types"
  ON packaging_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create packaging types
CREATE POLICY "Authenticated users can create packaging types"
  ON packaging_types
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own packaging types
CREATE POLICY "Users can update own packaging types"
  ON packaging_types
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own packaging types
CREATE POLICY "Users can delete own packaging types"
  ON packaging_types
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_packaging_types_updated_at
  BEFORE UPDATE ON packaging_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
