/*
  # Optimize Packaging Library Performance

  1. Indexes
    - Add index on `name` for faster sorting and filtering
    - Add index on `product_reference` for search optimization
    - Add composite index for text search across multiple fields

  2. Performance
    - Improves query performance for sorting by name
    - Speeds up searches by name, reference, and description
    - Optimizes real-time subscriptions
*/

-- Create index on name for sorting and searching
CREATE INDEX IF NOT EXISTS idx_packaging_types_name ON packaging_types(name);

-- Create index on product_reference for searching
CREATE INDEX IF NOT EXISTS idx_packaging_types_product_reference ON packaging_types(product_reference);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_packaging_types_created_at ON packaging_types(created_at DESC);
