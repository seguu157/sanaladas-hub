/*
  # Tracking de progreso del procesamiento de PDFs

  Añade columnas a `pending_pdfs` para que el dashboard pueda mostrar el
  progreso real del workflow de n8n vía Supabase Realtime.

  Valores posibles de `status`:
    - 'uploaded'         (default, lo escribe el dashboard al subir)
    - 'sent_to_n8n'      (lo escribe el dashboard antes de hacer fetch al webhook)
    - 'extracting_ai'    (lo escribe n8n tras subir el PDF a LlamaIndex)
    - 'creating_order'   (lo escribe n8n justo antes de llamar a receive-order)
    - 'completed'        (lo escribe la edge function receive-order al asociar)
    - 'failed'           (lo escribe el dashboard o n8n ante un error)
*/

ALTER TABLE pending_pdfs
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_pending_pdfs_status ON pending_pdfs(status);

-- Trigger para actualizar status_updated_at automáticamente cuando cambia status
CREATE OR REPLACE FUNCTION update_pending_pdf_status_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pending_pdfs_status_timestamp ON pending_pdfs;
CREATE TRIGGER pending_pdfs_status_timestamp
  BEFORE UPDATE ON pending_pdfs
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_pdf_status_timestamp();
