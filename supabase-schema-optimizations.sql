-- ============================================================
-- PERFORMANCE OPTIMIZATION: Add indexes to fix 504/500 errors
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Orders table - heavily queried
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);

-- 2. Profiles table - RLS policies use role checks constantly
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Order items - JOINed with products frequently
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- 4. Notifications - fetched with ordering and limits
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 5. Chat messages - fetched with ordering
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON public.chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON public.chat_messages(thread_id, created_at DESC);

-- 6. Chat threads
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON public.chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_assigned_sales ON public.chat_threads(assigned_sales_id);

-- 7. Cart items - user lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- 8. Products - filtering by flags
CREATE INDEX IF NOT EXISTS idx_products_is_best_seller ON public.products(is_best_seller) WHERE is_best_seller = true;
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_is_hot_deal ON public.products(is_hot_deal) WHERE is_hot_deal = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 9. Favorites and watch history
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_viewed_at ON public.watch_history(viewed_at DESC);

-- 10. Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- 11. Wholesale codes
CREATE INDEX IF NOT EXISTS idx_wholesale_codes_is_used ON public.wholesale_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_wholesale_codes_created_by ON public.wholesale_codes(created_by);

-- ============================================================
-- OPTIMIZE: Update statistics for query planner
-- ============================================================
ANALYZE public.orders;
ANALYZE public.profiles;
ANALYZE public.order_items;
ANALYZE public.notifications;
ANALYZE public.chat_messages;
ANALYZE public.products;

-- ============================================================
-- BONUS: Optimize current_role() function for RLS
-- This caches the role lookup to reduce repeated queries
-- ============================================================
-- Add a comment explaining the function
COMMENT ON FUNCTION public.current_role() IS 'Returns user role for RLS policies. Consider caching in application layer for frequent calls.';

-- ============================================================
-- VERIFY: Check index sizes (run after creation)
-- ============================================================
-- Uncomment to check index sizes:
/*
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
*/

-- ============================================================
-- OPTIONAL: Connection pooling note
-- If still experiencing issues, consider:
-- 1. Using Supabase connection pooling (pgBouncer)
-- 2. Implementing request deduplication in React
-- 3. Adding query result caching
-- ============================================================
