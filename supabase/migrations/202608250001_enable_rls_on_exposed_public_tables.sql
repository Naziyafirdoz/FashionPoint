-- Fashion Point: close public Data API access on tables flagged by
-- advisor rls_disabled_in_public.
-- Apply as a single targeted script. Do not db-push the unapplied backlog.

BEGIN;

DROP TABLE IF EXISTS public.order_reminders;

-- 1) Identity lookup FIRST (no self-referential EXISTS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own admin_users row" ON public.admin_users;
CREATE POLICY "Users read own admin_users row"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2) Public catalog
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
CREATE POLICY "Public read active categories"
  ON public.categories
  FOR SELECT
  TO public
  USING (is_active = true);

ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active sub_categories" ON public.sub_categories;
CREATE POLICY "Public read active sub_categories"
  ON public.sub_categories
  FOR SELECT
  TO public
  USING (is_active = true);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read variants of active products" ON public.product_variants;
CREATE POLICY "Public read variants of active products"
  ON public.product_variants
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.id = product_id
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS "Staff read all product_variants" ON public.product_variants;
CREATE POLICY "Staff read all product_variants"
  ON public.product_variants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active branches" ON public.branches;
CREATE POLICY "Public read active branches"
  ON public.branches
  FOR SELECT
  TO public
  USING (is_active = true);

ALTER TABLE public.branch_service_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read service areas of active branches" ON public.branch_service_areas;
CREATE POLICY "Public read service areas of active branches"
  ON public.branch_service_areas
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.branches b
      WHERE b.id = branch_id
        AND b.is_active = true
    )
  );

-- 3) Customer-owned
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers select own profile" ON public.customers;
CREATE POLICY "Customers select own profile"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Customers insert own profile" ON public.customers;
CREATE POLICY "Customers insert own profile"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Customers update own profile" ON public.customers;
CREATE POLICY "Customers update own profile"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers manage own addresses" ON public.addresses;
CREATE POLICY "Customers manage own addresses"
  ON public.addresses
  FOR ALL
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers manage own wishlist" ON public.wishlist;
CREATE POLICY "Customers manage own wishlist"
  ON public.wishlist
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
CREATE POLICY "Users read own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff read all orders" ON public.orders;
CREATE POLICY "Staff read all orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read approved reviews" ON public.reviews;
CREATE POLICY "Public read approved reviews"
  ON public.reviews
  FOR SELECT
  TO public
  USING (status = 'approved');

DROP POLICY IF EXISTS "Users read own reviews" ON public.reviews;
CREATE POLICY "Users read own reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff read all reviews" ON public.reviews;
CREATE POLICY "Staff read all reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- 4) Server-only: RLS on, no client policies
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

COMMIT;
