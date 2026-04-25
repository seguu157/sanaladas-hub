/*
  # Corregir todas las foreign keys incorrectas

  1. Problema
    - Múltiples tablas tienen foreign keys a `users(id)` que no existe
    - Deben apuntar a `auth.users(id)` o eliminarse si no son necesarias

  2. Tablas afectadas
    - orders: user_id -> auth.users(id)
    - order_comments: user_id -> auth.users(id)  
    - products: user_id -> auth.users(id)
    - order_products: completed_by -> auth.users(id)
    - order_tableware: completed_by -> auth.users(id)
    - completion_tracking: completed_by -> auth.users(id)
    - ai_conversations: user_id -> auth.users(id)
*/

-- Tabla: orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla: order_comments  
ALTER TABLE order_comments DROP CONSTRAINT IF EXISTS order_comments_user_id_fkey;
ALTER TABLE order_comments ADD CONSTRAINT order_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla: products
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_user_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tabla: order_products
ALTER TABLE order_products DROP CONSTRAINT IF EXISTS order_products_completed_by_fkey;
ALTER TABLE order_products ADD CONSTRAINT order_products_completed_by_fkey 
  FOREIGN KEY (completed_by) REFERENCES auth.users(id);

-- Tabla: order_tableware
ALTER TABLE order_tableware DROP CONSTRAINT IF EXISTS order_tableware_completed_by_fkey;
ALTER TABLE order_tableware ADD CONSTRAINT order_tableware_completed_by_fkey 
  FOREIGN KEY (completed_by) REFERENCES auth.users(id);

-- Tabla: completion_tracking
ALTER TABLE completion_tracking DROP CONSTRAINT IF EXISTS completion_tracking_completed_by_fkey;
ALTER TABLE completion_tracking ADD CONSTRAINT completion_tracking_completed_by_fkey 
  FOREIGN KEY (completed_by) REFERENCES auth.users(id);

-- Tabla: ai_conversations
ALTER TABLE ai_conversations DROP CONSTRAINT IF EXISTS ai_conversations_user_id_fkey;
ALTER TABLE ai_conversations ADD CONSTRAINT ai_conversations_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verificar que todas las funciones uid() funcionen correctamente
-- La función auth.uid() devuelve el ID del usuario autenticado de auth.users

-- Actualizar políticas RLS para asegurar que funcionen con auth.users
-- Todas las políticas que usan uid() ya deberían funcionar correctamente
-- porque uid() devuelve auth.users.id

COMMENT ON CONSTRAINT orders_user_id_fkey ON orders IS 'References auth.users for proper authentication';
COMMENT ON CONSTRAINT order_comments_user_id_fkey ON order_comments IS 'References auth.users for proper authentication';
COMMENT ON CONSTRAINT products_user_id_fkey ON products IS 'References auth.users for proper authentication';
COMMENT ON CONSTRAINT ai_conversations_user_id_fkey ON ai_conversations IS 'References auth.users for proper authentication';