/*
  # Crear tabla de PDFs pendientes

  1. Nueva Tabla
    - `pending_pdfs`
      - `id` (uuid, primary key)
      - `file_name` (text) - Nombre original del archivo
      - `file_path` (text) - Ruta en Storage
      - `file_size` (bigint) - Tamaño del archivo
      - `uploaded_at` (timestamptz) - Fecha de subida
      - `user_id` (uuid) - Usuario que subió el PDF
      - `processed` (boolean) - Si ya fue asociado a un pedido
      - `order_id` (uuid, nullable) - ID del pedido asociado

  2. Seguridad
    - Habilitar RLS
    - Usuarios pueden ver y crear sus propios PDFs pendientes
    - Usuarios pueden actualizar sus propios PDFs pendientes

  3. Notas
    - Los PDFs pendientes esperan a que llegue el JSON del webhook
    - Se pueden limpiar automáticamente después de 24 horas si no se procesan
*/

CREATE TABLE IF NOT EXISTS pending_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  processed boolean DEFAULT false,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE pending_pdfs ENABLE ROW LEVEL SECURITY;

-- Política para ver propios PDFs pendientes
CREATE POLICY "Users can view their own pending PDFs"
  ON pending_pdfs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política para crear propios PDFs pendientes
CREATE POLICY "Users can create their own pending PDFs"
  ON pending_pdfs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política para actualizar propios PDFs pendientes
CREATE POLICY "Users can update their own pending PDFs"
  ON pending_pdfs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para eliminar propios PDFs pendientes
CREATE POLICY "Users can delete their own pending PDFs"
  ON pending_pdfs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índice para búsquedas por nombre de archivo
CREATE INDEX IF NOT EXISTS idx_pending_pdfs_file_name ON pending_pdfs(file_name);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_pending_pdfs_user_id ON pending_pdfs(user_id);

-- Índice para PDFs no procesados
CREATE INDEX IF NOT EXISTS idx_pending_pdfs_processed ON pending_pdfs(processed) WHERE processed = false;
