/*
  # Fix Security and Performance Issues - Part 2: Remaining RLS Policies

  ## Changes
  1. Optimize AI conversations RLS policies (remove duplicates)
  2. Optimize user profiles, completion tracking, recipes RLS policies
  3. Optimize packaging, products, shopping list, pending PDFs RLS policies
  4. Enable RLS on unprotected public tables

  ## Security Notes
  - Consolidates duplicate policies
  - Optimizes auth function calls
  - Enables protection on all public tables
*/

-- ============================================================================
-- 1. AI_CONVERSATIONS TABLE (Remove duplicates, optimize)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own conversations" ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON public.ai_conversations;
CREATE POLICY "Users can create own conversations" ON public.ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_conversations;
CREATE POLICY "Users can update own conversations" ON public.ai_conversations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own conversations" ON public.ai_conversations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- 2. USER_PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()));

-- ============================================================================
-- 3. COMPLETION_TRACKING TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view completion tracking on their orders" ON public.completion_tracking;
CREATE POLICY "Users can view completion tracking on their orders" ON public.completion_tracking
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = completion_tracking.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert completion tracking on their orders" ON public.completion_tracking;
CREATE POLICY "Users can insert completion tracking on their orders" ON public.completion_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = completion_tracking.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can update completion tracking on their orders" ON public.completion_tracking;
CREATE POLICY "Users can update completion tracking on their orders" ON public.completion_tracking
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = completion_tracking.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can delete completion tracking on their orders" ON public.completion_tracking;
CREATE POLICY "Users can delete completion tracking on their orders" ON public.completion_tracking
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = completion_tracking.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

-- ============================================================================
-- 4. RECIPES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON public.recipes;
CREATE POLICY "Authenticated users can insert recipes" ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

-- ============================================================================
-- 5. PACKAGING_TYPES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create packaging types" ON public.packaging_types;
CREATE POLICY "Authenticated users can create packaging types" ON public.packaging_types
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own packaging types" ON public.packaging_types;
CREATE POLICY "Users can update own packaging types" ON public.packaging_types
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own packaging types" ON public.packaging_types;
CREATE POLICY "Users can delete own packaging types" ON public.packaging_types
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

-- ============================================================================
-- 6. PRODUCTS_INVENTORY TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own products" ON public.products_inventory;
CREATE POLICY "Users can insert own products" ON public.products_inventory
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own products" ON public.products_inventory;
CREATE POLICY "Users can update own products" ON public.products_inventory
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own products" ON public.products_inventory;
CREATE POLICY "Users can delete own products" ON public.products_inventory
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

-- ============================================================================
-- 7. SHOPPING_LIST TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own shopping list" ON public.shopping_list;
CREATE POLICY "Users can view own shopping list" ON public.shopping_list
  FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own shopping list items" ON public.shopping_list;
CREATE POLICY "Users can insert own shopping list items" ON public.shopping_list
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own shopping list items" ON public.shopping_list;
CREATE POLICY "Users can update own shopping list items" ON public.shopping_list
  FOR UPDATE TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own shopping list items" ON public.shopping_list;
CREATE POLICY "Users can delete own shopping list items" ON public.shopping_list
  FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));

-- ============================================================================
-- 8. PENDING_PDFS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own pending PDFs" ON public.pending_pdfs;
CREATE POLICY "Users can view their own pending PDFs" ON public.pending_pdfs
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own pending PDFs" ON public.pending_pdfs;
CREATE POLICY "Users can create their own pending PDFs" ON public.pending_pdfs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own pending PDFs" ON public.pending_pdfs;
CREATE POLICY "Users can update their own pending PDFs" ON public.pending_pdfs
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own pending PDFs" ON public.pending_pdfs;
CREATE POLICY "Users can delete their own pending PDFs" ON public.pending_pdfs
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- 9. PRODUCTOS_HOLDED TABLE
-- ============================================================================

DROP POLICY IF EXISTS "service-role-full-access" ON public.productos_holded;
CREATE POLICY "Authenticated users can access productos holded" ON public.productos_holded
  FOR ALL TO authenticated
  USING (true);

-- ============================================================================
-- 10. ENABLE RLS ON PUBLIC TABLES WITHOUT PROTECTION
-- ============================================================================

-- DOCUMENTS TABLE
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public' AND tablename = 'documents'
  ) THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
    CREATE POLICY "Authenticated users can view documents" ON public.documents
      FOR SELECT TO authenticated
      USING (true);
    
    DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
    CREATE POLICY "Authenticated users can insert documents" ON public.documents
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- TAX_CODES TABLE
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public' AND tablename = 'tax_codes'
  ) THEN
    ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can manage tax codes" ON public.tax_codes;
    CREATE POLICY "Authenticated users can manage tax codes" ON public.tax_codes
      FOR ALL TO authenticated
      USING (true);
  END IF;
END $$;

-- RECORD_MANAGER TABLE
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public' AND tablename = 'record_manager'
  ) THEN
    ALTER TABLE public.record_manager ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can manage records" ON public.record_manager;
    CREATE POLICY "Authenticated users can manage records" ON public.record_manager
      FOR ALL TO authenticated
      USING (true);
  END IF;
END $$;

-- CLIENTES TABLE
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public' AND tablename = 'clientes'
  ) THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clientes;
    CREATE POLICY "Authenticated users can manage clients" ON public.clientes
      FOR ALL TO authenticated
      USING (true);
  END IF;
END $$;

-- N8N_CHAT_HISTORIES TABLE
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public' AND tablename = 'n8n_chat_histories'
  ) THEN
    ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can manage chat histories" ON public.n8n_chat_histories;
    CREATE POLICY "Authenticated users can manage chat histories" ON public.n8n_chat_histories
      FOR ALL TO authenticated
      USING (true);
  END IF;
END $$;
