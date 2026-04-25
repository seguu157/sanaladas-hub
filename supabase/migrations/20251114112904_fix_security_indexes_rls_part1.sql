/*
  # Fix Security and Performance Issues - Part 1: Indexes and Basic RLS

  ## Changes
  1. Add missing foreign key indexes for performance
  2. Optimize main RLS policies with (select auth.uid())
  3. Remove duplicate policies

  ## Security Notes
  - Performance improvement through better indexing
  - RLS optimization to prevent per-row auth function evaluation
*/

-- ============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pending_pdfs_order_id ON public.pending_pdfs(order_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON public.recipes(created_by);

-- ============================================================================
-- 2. OPTIMIZE ORDERS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow webhook order creation" ON public.orders;
CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete unassigned orders" ON public.orders;
CREATE POLICY "Users can delete their own orders" ON public.orders
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Authenticated users can update unassigned orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can view unassigned orders" ON public.orders;

-- ============================================================================
-- 3. OPTIMIZE ORDER_COMMENTS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view comments on their orders" ON public.order_comments;
CREATE POLICY "Users can view comments on their orders" ON public.order_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_comments.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert comments on their orders" ON public.order_comments;
CREATE POLICY "Users can insert comments on their orders" ON public.order_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_comments.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.order_comments;
CREATE POLICY "Users can update their own comments" ON public.order_comments
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.order_comments;
CREATE POLICY "Users can delete their own comments" ON public.order_comments
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- 4. OPTIMIZE ORDER_PRODUCTS TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view products on their orders" ON public.order_products;
CREATE POLICY "Users can view products on their orders" ON public.order_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_products.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert products on their orders" ON public.order_products;
DROP POLICY IF EXISTS "Allow webhook product creation" ON public.order_products;
CREATE POLICY "Users can manage products on orders" ON public.order_products
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_products.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can update products on their orders" ON public.order_products;
CREATE POLICY "Users can update products on their orders" ON public.order_products
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_products.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can delete products on their orders" ON public.order_products;
CREATE POLICY "Users can delete products on their orders" ON public.order_products
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_products.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

-- ============================================================================
-- 5. OPTIMIZE ORDER_TABLEWARE TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view tableware on their orders" ON public.order_tableware;
CREATE POLICY "Users can view tableware on their orders" ON public.order_tableware
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_tableware.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert tableware on their orders" ON public.order_tableware;
DROP POLICY IF EXISTS "Allow webhook tableware creation" ON public.order_tableware;
CREATE POLICY "Users can manage tableware on orders" ON public.order_tableware
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_tableware.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can update tableware on their orders" ON public.order_tableware;
CREATE POLICY "Users can update tableware on their orders" ON public.order_tableware
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_tableware.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can delete tableware on their orders" ON public.order_tableware;
CREATE POLICY "Users can delete tableware on their orders" ON public.order_tableware
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_tableware.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

-- ============================================================================
-- 6. OPTIMIZE MEAL_TIMES TABLE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view meal times on their orders" ON public.meal_times;
CREATE POLICY "Users can view meal times on their orders" ON public.meal_times
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = meal_times.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can insert meal times on their orders" ON public.meal_times;
DROP POLICY IF EXISTS "Allow webhook meal times creation" ON public.meal_times;
CREATE POLICY "Users can manage meal times on orders" ON public.meal_times
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = meal_times.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can update meal times on their orders" ON public.meal_times;
CREATE POLICY "Users can update meal times on their orders" ON public.meal_times
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = meal_times.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

DROP POLICY IF EXISTS "Users can delete meal times on their orders" ON public.meal_times;
CREATE POLICY "Users can delete meal times on their orders" ON public.meal_times
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = meal_times.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );
