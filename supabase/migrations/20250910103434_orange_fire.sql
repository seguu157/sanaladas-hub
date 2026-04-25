/*
  # Crear bucket de storage para PDFs

  1. Storage
    - Crear bucket `order-pdfs` para almacenar archivos PDF
    - Configurar políticas de acceso seguro
    - Permitir solo archivos PDF
    - Acceso restringido por usuario

  2. Seguridad
    - Solo usuarios autenticados pueden subir archivos
    - Cada usuario solo puede acceder a sus propios archivos
    - URLs firmadas para descarga segura
*/

-- Crear el bucket para PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-pdfs',
  'order-pdfs', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- Política para permitir subida de archivos (usuarios autenticados pueden subir a su carpeta)
CREATE POLICY "Users can upload PDFs to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir descarga de archivos (usuarios pueden descargar sus propios archivos)
CREATE POLICY "Users can download their own PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir eliminación de archivos (usuarios pueden eliminar sus propios archivos)
CREATE POLICY "Users can delete their own PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir actualización de archivos (usuarios pueden actualizar sus propios archivos)
CREATE POLICY "Users can update their own PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'order-pdfs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);