/*
  # Enable Realtime for All Tables
  
  1. Changes
    - Enable realtime replication for all main tables
    - This allows real-time updates without page refresh
    - Includes: packaging_types, order_packaging, products_inventory, recipes, 
      order_comments, product_categories, ai_conversations, webhook_logs, pending_pdfs
  
  2. Security
    - Realtime respects existing RLS policies
    - Only authenticated users receive updates they have access to
  
  3. Performance
    - Enables instant UI updates across all features
    - Reduces need for manual refreshes
    - Improves user experience with live data synchronization
*/

-- Enable realtime for packaging tables
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'packaging_types'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE packaging_types;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'order_packaging'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_packaging;
  END IF;
END $$;

-- Enable realtime for inventory and recipes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'products_inventory'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products_inventory;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'recipes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
  END IF;
END $$;

-- Enable realtime for comments and categories
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'order_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_comments;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'product_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE product_categories;
  END IF;
END $$;

-- Enable realtime for AI conversations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'ai_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ai_conversations;
  END IF;
END $$;

-- Enable realtime for webhook logs and pending PDFs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'webhook_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE webhook_logs;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'pending_pdfs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pending_pdfs;
  END IF;
END $$;