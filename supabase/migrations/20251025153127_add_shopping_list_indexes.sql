/*
  # Add Shopping List Performance Indexes

  1. New Indexes
    - Add index on shopping_list.product_id for faster foreign key lookups
    - Add index on shopping_list.created_at for faster sorting

  2. Performance Impact
    - Speeds up shopping list queries with product joins
    - Improves ordering performance
*/

-- Shopping list indexes
CREATE INDEX IF NOT EXISTS idx_shopping_list_product_id 
  ON shopping_list(product_id);

CREATE INDEX IF NOT EXISTS idx_shopping_list_created_at 
  ON shopping_list(created_at DESC);
