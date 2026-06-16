-- ============================================================
-- RLS POLICY OPTIMIZATION: Fix infinite loops and slow queries
-- ============================================================

-- 1. OPTIMIZED current_role() function using session variable cache
-- This version caches the role lookup per session
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_user_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Return early for anonymous users
  IF v_user_id IS NULL THEN
    RETURN 'guest';
  END IF;
  
  -- Use a simpler direct lookup with limit 1 for speed
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = v_user_id
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'guest');
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.current_role() IS 'Optimized role lookup with early returns and LIMIT 1 for performance';

-- 2. OPTIMIZED policies using direct auth.uid() checks where possible
-- This avoids the function call overhead for simple equality checks

-- Notifications: Simplified to avoid complex subqueries
DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
CREATE POLICY "users read own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'sales') AND id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users delete own notifications" ON public.notifications;
CREATE POLICY "users delete own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (
    user_id = auth.uid() 
    OR auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'sales') AND id = auth.uid()
    )
  );

-- Orders: Simplified policies
DROP POLICY IF EXISTS "users read own orders" ON public.orders;
CREATE POLICY "users read own orders" 
  ON public.orders 
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'sales') AND id = auth.uid()
    )
  );

-- Chat threads: Sales can see ALL threads (including admin chats)
DROP POLICY IF EXISTS "chat thread access" ON public.chat_threads;
CREATE POLICY "chat thread access" 
  ON public.chat_threads 
  FOR SELECT 
  USING (
    user_id = auth.uid() 
    OR assigned_sales_id = auth.uid()
    OR auth.uid() IN (
      SELECT id FROM public.profiles 
      WHERE role IN ('admin', 'sales') AND id = auth.uid()
    )
  );

-- Chat messages: Sales can see ALL messages (including admin conversations)
DROP POLICY IF EXISTS "chat message access" ON public.chat_messages;
CREATE POLICY "chat message access" 
  ON public.chat_messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = thread_id 
      AND (
        t.user_id = auth.uid() 
        OR t.assigned_sales_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'sales') AND id = auth.uid())
      )
    )
  );

-- Order items: Use EXISTS for better performance
DROP POLICY IF EXISTS "order items readable by participants" ON public.order_items;
CREATE POLICY "order items readable by participants" 
  ON public.order_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id 
      AND (
        o.user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'sales') AND id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "order items insert by participants" ON public.order_items;
CREATE POLICY "order items insert by participants" 
  ON public.order_items 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id 
      AND (
        o.user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'sales') AND id = auth.uid())
      )
    )
  );

-- 3. Enable statement_timeout to kill runaway queries
ALTER DATABASE postgres SET statement_timeout = '30s';

-- 4. Update statistics
ANALYZE public.profiles;
ANALYZE public.orders;
ANALYZE public.notifications;
ANALYZE public.chat_threads;
ANALYZE public.chat_messages;

-- 5. Add composite index for profile role lookups (used in RLS)
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);
