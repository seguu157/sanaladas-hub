/*
  # Enable Realtime for Order Progress
  
  1. Changes
    - Enable realtime replication for order_progress table
    - This allows clients to subscribe to changes in order progress
  
  2. Notes
    - This is required for the progress bar to update in real-time
    - Clients can now listen to INSERT, UPDATE, DELETE events on order_progress
*/

-- Enable realtime for order_progress table
ALTER PUBLICATION supabase_realtime ADD TABLE order_progress;