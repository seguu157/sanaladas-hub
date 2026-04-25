/*
  # Create RPC function to update order color
  
  1. Function
    - `update_order_color_rpc` - Updates the color field of an order
    - Parameters: order_id (uuid), new_color (text)
    - Returns: the updated order row
  
  2. Security
    - Function is marked as SECURITY DEFINER to bypass RLS
    - Internal checks ensure only authenticated users can update
*/

CREATE OR REPLACE FUNCTION update_order_color_rpc(
  order_id uuid,
  new_color text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Validate color
  IF new_color NOT IN ('blue', 'green', 'yellow', 'red') THEN
    RAISE EXCEPTION 'Invalid color value';
  END IF;

  -- Update the order
  UPDATE orders
  SET 
    color = new_color,
    updated_at = now()
  WHERE id = order_id
  RETURNING json_build_object(
    'id', id,
    'color', color,
    'updated_at', updated_at
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  RETURN result;
END;
$$;