-- Fashion Point — Supabase schema
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  show_in_navbar boolean DEFAULT false,
  navbar_position integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sub_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_slug ON sub_categories(slug);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description text,
  detailed_description text,
  category_id uuid REFERENCES categories(id),
  sub_category_id uuid REFERENCES sub_categories(id) ON DELETE SET NULL,
  price numeric NOT NULL,
  compare_price numeric,
  sku text UNIQUE,
  stock_quantity integer DEFAULT 0,
  fabric text,
  neck_type text,
  sleeve_type text,
  closure_type text,
  occasion text[],
  colors text[],
  color_swatches jsonb NOT NULL DEFAULT '[]'::jsonb,
  sizes text[],
  images text[],
  tags text[],
  seo_title text,
  seo_description text,
  status text DEFAULT 'draft',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_bestseller boolean DEFAULT false,
  is_new boolean DEFAULT true,
  ai_size_enabled boolean DEFAULT true,
  ai_color_enabled boolean DEFAULT true,
  ai_style_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL,
  color text NOT NULL,
  sku text,
  stock_quantity integer DEFAULT 0,
  price numeric,
  compare_price numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, size, color)
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  guest_email text,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  shipping_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total numeric NOT NULL,
  status text DEFAULT 'pending',
  payment_method text,
  payment_status text DEFAULT 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  shipping_address jsonb,
  billing_address jsonb,
  tracking_id text,
  courier_name text,
  notes text,
  refund_amount numeric,
  refund_date timestamptz,
  refund_reference text,
  refund_notes text,
  refund_initiated_at timestamptz,
  expected_refund_date timestamptz,
  delivery_confirmed_at timestamptz,
  otp_verified_at timestamptz,
  shipping_date timestamptz,
  delivery_otp text,
  courier_partner text,
  coupon_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  notes text,
  image_url text,
  status text NOT NULL DEFAULT 'return_requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT return_requests_order_id_unique UNIQUE (order_id)
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  email text,
  phone text,
  avatar_url text,
  bust_measurement numeric,
  waist_measurement numeric,
  shoulder_measurement numeric,
  underbust_measurement numeric,
  height_cm numeric,
  weight_kg numeric,
  preferred_size text,
  recommended_size text,
  fit_preference text,
  sizing_updated_at timestamptz,
  customer_group text DEFAULT 'regular',
  total_orders integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  label text,
  name text,
  phone text,
  line1 text,
  line2 text,
  city text,
  state text,
  pincode text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  user_id uuid REFERENCES auth.users(id),
  order_id uuid REFERENCES orders(id),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  images text[],
  size_purchased text,
  color_purchased text,
  status text DEFAULT 'pending',
  is_verified_purchase boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  product_id uuid REFERENCES products(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text,
  value numeric NOT NULL,
  min_order_amount numeric DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS out_of_stock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  bust numeric,
  waist numeric,
  shoulder numeric,
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  channel text[],
  status text DEFAULT 'draft',
  start_date date,
  end_date date,
  revenue_generated numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature text,
  user_id uuid REFERENCES auth.users(id),
  input_data jsonb,
  output_data jsonb,
  was_successful boolean,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text,
  featured_image text,
  category text,
  tags text[],
  seo_title text,
  seo_description text,
  related_product_ids uuid[],
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text DEFAULT 'admin'
);

-- RLS (enable in Supabase dashboard)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON products FOR SELECT USING (is_active = true);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers manage own addresses" ON addresses
  FOR ALL
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own orders" ON orders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_unique
  ON orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own AI history" ON ai_interactions
  FOR SELECT
  USING (user_id = auth.uid());
