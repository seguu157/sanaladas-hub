/*
  # Arreglar políticas RLS para permitir webhooks

  ## Cambios
  
  1. **Tabla orders**
     - Agregar política para permitir INSERT con service_role
     - Esto permite que el webhook de N8N guarde pedidos usando SUPABASE_SERVICE_ROLE_KEY
  
  2. **Tablas relacionadas**
     - Agregar políticas para service_role en order_products
     - Agregar políticas para service_role en order_tableware
     - Agregar políticas para service_role en meal_times
  
  3. **Tabla user_profiles**
     - Agregar política SELECT para service_role
  
  ## Notas
  - service_role tiene permisos completos y puede bypassear RLS
  - Estas políticas son necesarias para que el webhook funcione
  - El webhook valida los datos antes de insertarlos
*/

-- Drop políticas existentes si existen para evitar conflictos
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Service role can insert orders" ON orders;
  DROP POLICY IF EXISTS "Service role can view all orders" ON orders;
  DROP POLICY IF EXISTS "Service role can insert products" ON order_products;
  DROP POLICY IF EXISTS "Service role can insert tableware" ON order_tableware;
  DROP POLICY IF EXISTS "Service role can insert meal times" ON meal_times;
  DROP POLICY IF EXISTS "Service role can view all profiles" ON user_profiles;
END $$;

-- Política para que service_role pueda insertar orders
CREATE POLICY "Service role can insert orders"
  ON orders
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política para que service_role pueda ver orders
CREATE POLICY "Service role can view all orders"
  ON orders
  FOR SELECT
  TO service_role
  USING (true);

-- Política para que service_role pueda insertar productos
CREATE POLICY "Service role can insert products"
  ON order_products
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política para que service_role pueda insertar menaje
CREATE POLICY "Service role can insert tableware"
  ON order_tableware
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política para que service_role pueda insertar horarios
CREATE POLICY "Service role can insert meal times"
  ON meal_times
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política para que service_role pueda ver perfiles
CREATE POLICY "Service role can view all profiles"
  ON user_profiles
  FOR SELECT
  TO service_role
  USING (true);
