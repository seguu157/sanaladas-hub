/*
  # Crear tabla de pedidos

  1. Nueva Tabla
    - `orders`
      - `id` (uuid, primary key)
      - `file_name` (text)
      - `upload_date` (timestamptz)
      - `event_date` (text) - formato español "25 diciembre"
      - `client_company` (text)
      - `client_contact` (text)
      - `client_address` (text)
      - `client_phone` (text)
      - `number_of_attendees` (integer)
      - `sales_representative` (text)
      - `extracted_data` (jsonb) - datos completos extraídos
      - `completion_status` (jsonb) - estado de completado
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `user_id` (uuid, foreign key)

  2. Seguridad
    - Habilitar RLS en tabla `orders`
    - Políticas para CRUD por usuario autenticado
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  upload_date timestamptz DEFAULT now(),
  event_date text NOT NULL,
  client_company text NOT NULL,
  client_contact text NOT NULL,
  client_address text NOT NULL,
  client_phone text NOT NULL,
  number_of_attendees integer NOT NULL DEFAULT 0,
  sales_representative text NOT NULL DEFAULT '',
  extracted_data jsonb NOT NULL,
  completion_status jsonb DEFAULT '{"tableware": 0, "products": 0, "totalTableware": 0, "totalProducts": 0}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_event_date ON orders(event_date);
CREATE INDEX IF NOT EXISTS idx_orders_client_company ON orders(client_company);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();