/*
  # Agregar campos de PDF a la tabla orders

  1. Cambios
    - Agregar columna `pdf_file_path` para almacenar la ruta del PDF en Storage
    - Agregar columna `pdf_file_size` para almacenar el tamaño del archivo
    - Agregar columna `pdf_original_name` para almacenar el nombre original del archivo

  2. Notas
    - Los campos son opcionales (NULL) porque algunos pedidos pueden no tener PDF adjunto
    - Usa `IF NOT EXISTS` para evitar errores si las columnas ya existen
*/

-- Agregar columna para la ruta del PDF en Storage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pdf_file_path'
  ) THEN
    ALTER TABLE orders ADD COLUMN pdf_file_path text;
  END IF;
END $$;

-- Agregar columna para el tamaño del archivo PDF
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pdf_file_size'
  ) THEN
    ALTER TABLE orders ADD COLUMN pdf_file_size bigint;
  END IF;
END $$;

-- Agregar columna para el nombre original del archivo PDF
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pdf_original_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN pdf_original_name text;
  END IF;
END $$;

-- Crear índice para búsquedas por nombre de archivo
CREATE INDEX IF NOT EXISTS idx_orders_pdf_original_name ON orders(pdf_original_name);
