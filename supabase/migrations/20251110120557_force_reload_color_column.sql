/*
  # Forzar recarga del schema cache para columna color

  1. Cambios
    - Modificar temporalmente la columna para forzar recarga
    - Restaurar estado original
    - Notificar a PostgREST

  2. Objetivo
    - Forzar a PostgREST a reconocer la columna color
*/

-- Agregar un comentario a la columna para forzar cambio en el schema
COMMENT ON COLUMN orders.color IS 'Color de identificación del pedido: blue, green, yellow, red';

-- Forzar recarga
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
