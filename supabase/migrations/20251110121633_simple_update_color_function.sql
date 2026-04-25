/*
  # Función simple para actualizar color (sin validación auth para pedidos unassigned)

  1. Nueva Función
    - `simple_update_order_color`: Actualiza color de manera simple
    - Permite editar pedidos sin usuario asignado
    - Permite editar pedidos propios

  2. Seguridad
    - Valida colores permitidos
    - Solo permite editar si user_id es NULL o coincide con el usuario actual
*/

CREATE OR REPLACE FUNCTION simple_update_order_color(
  p_order_id uuid,
  p_color text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validar color
  IF p_color NOT IN ('blue', 'green', 'yellow', 'red') THEN
    RAISE EXCEPTION 'Invalid color: %', p_color;
  END IF;

  -- Actualizar el color (permite si user_id es NULL o si coincide con el usuario actual)
  UPDATE orders 
  SET 
    color = p_color,
    updated_at = now()
  WHERE id = p_order_id
  AND (user_id IS NULL OR user_id = auth.uid())
  RETURNING json_build_object(
    'id', id,
    'color', color,
    'updated_at', updated_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Order not found or permission denied';
  END IF;

  RETURN v_result;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION simple_update_order_color TO authenticated;
GRANT EXECUTE ON FUNCTION simple_update_order_color TO anon;

COMMENT ON FUNCTION simple_update_order_color IS 'Simple color update function (bypasses PostgREST cache)';
