/*
  # Remove color field from orders table

  1. Changes
    - Drop the color column from orders table
    - This removes all color-related functionality from the database

  2. Notes
    - Data in the color column will be permanently deleted
*/

-- Drop the color column
ALTER TABLE orders DROP COLUMN IF EXISTS color;
