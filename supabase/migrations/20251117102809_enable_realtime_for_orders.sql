/*
  # Enable Realtime for Orders Table

  1. Changes
    - Enable realtime replication for the orders table
    - This allows the frontend to receive real-time updates when order data changes
    - Specifically fixes the issue where order_color updates don't propagate to the UI

  2. Security
    - Realtime respects existing RLS policies
    - Only authenticated users will receive updates for orders they have access to
*/

-- Enable realtime for the orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
