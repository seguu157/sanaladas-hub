/*
  # Add Performance Indexes

  1. Indexes
    - Add index on orders.created_at for faster sorting
    - Add index on orders.user_id for faster user queries
    - Add index on order_comments.order_id for faster comment lookups
    - Add index on recipes.nombre_receta for faster recipe searches
    - Add index on packaging_types.name for faster packaging searches
    - Add index on products_inventory.product_name for faster product searches

  2. Performance
    - These indexes will significantly speed up common queries
    - Especially beneficial for list views and search operations
*/

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Order comments index
CREATE INDEX IF NOT EXISTS idx_order_comments_order_id ON order_comments(order_id);

-- Recipes index
CREATE INDEX IF NOT EXISTS idx_recipes_nombre_receta ON recipes(nombre_receta);

-- Packaging types index
CREATE INDEX IF NOT EXISTS idx_packaging_types_name ON packaging_types(name);

-- Products inventory index
CREATE INDEX IF NOT EXISTS idx_products_inventory_product_name ON products_inventory(product_name);