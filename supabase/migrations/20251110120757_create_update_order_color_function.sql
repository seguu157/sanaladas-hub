/*
  # Crear función RPC para actualizar color de pedidos

  1. Nueva Función
    - `update_order_color`: Actualiza el color de un pedido usando SQL directo
    - Bypasea el cache de PostgREST
    - Valida que el color sea válido

  2. Seguridad
    - Verifica permisos del usuario (owner o unassigned order)
    - Solo permite colores válidos
*/

CREATE OR REPLACE FUNCTION update_order_color(
  order_id uuid,
  new_color text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar que el color sea válido
  IF new_color NOT IN ('blue', 'green', 'yellow', 'red') THEN
    RAISE EXCEPTION 'Invalid color. Must be blue, green, yellow, or red';
  END IF;

  -- Verificar permisos: usuario autenticado puede editar sus pedidos o pedidos sin asignar
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = order_id 
    AND (user_id = auth.uid() OR user_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Actualizar color
  UPDATE orders 
  SET color = new_color,
      updated_at = now()
  WHERE id = order_id;
END;
$$;

-- Permitir a usuarios autenticados ejecutar esta función
GRANT EXECUTE ON FUNCTION update_order_color TO authenticated;

-- Comentario
COMMENT ON FUNCTION update_order_color IS 'Updates order color (workaround for PostgREST cache issue)';
