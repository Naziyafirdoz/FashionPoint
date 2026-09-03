-- Additive homepage campaign product/category targeting.
-- Does not rewrite homepage_hero_campaigns rows, content_style, or existing campaign data.
-- Existing campaigns keep scope NULL and no junction rows until an admin saves targeting.

BEGIN;

ALTER TABLE public.homepage_hero_campaigns
  ADD COLUMN IF NOT EXISTS scope text;

ALTER TABLE public.homepage_hero_campaigns
  DROP CONSTRAINT IF EXISTS homepage_hero_campaigns_scope_check;

ALTER TABLE public.homepage_hero_campaigns
  ADD CONSTRAINT homepage_hero_campaigns_scope_check
  CHECK (scope IS NULL OR scope IN ('product', 'category'));

CREATE TABLE IF NOT EXISTS public.campaign_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.homepage_hero_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.campaign_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.homepage_hero_campaigns(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_products_product_id
  ON public.campaign_products (product_id);

CREATE INDEX IF NOT EXISTS idx_campaign_categories_category_id
  ON public.campaign_categories (category_id);

ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_categories ENABLE ROW LEVEL SECURITY;

COMMIT;
