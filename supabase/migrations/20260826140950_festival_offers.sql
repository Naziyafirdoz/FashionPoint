-- Festival Offers foundation: time-bounded catalog promotions.
-- Independent of unused coupons and campaigns tables.
-- Access is server-only (service role). No client write/read policies.

BEGIN;

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  scope text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offers_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT offers_discount_type_check CHECK (discount_type IN ('percentage', 'fixed_amount')),
  CONSTRAINT offers_scope_check CHECK (scope IN ('product', 'category')),
  CONSTRAINT offers_discount_value_check CHECK (
    discount_value > 0
    AND (discount_type <> 'percentage' OR discount_value <= 100)
  ),
  CONSTRAINT offers_schedule_check CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.offer_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.offer_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_offers_enabled_window
  ON public.offers (is_enabled, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_offer_products_product_id
  ON public.offer_products (product_id);

CREATE INDEX IF NOT EXISTS idx_offer_categories_category_id
  ON public.offer_categories (category_id);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_categories ENABLE ROW LEVEL SECURITY;

COMMIT;
