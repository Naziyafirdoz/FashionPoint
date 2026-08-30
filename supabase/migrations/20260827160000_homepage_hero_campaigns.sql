-- Additive homepage campaign hero table.
-- Independent of offers, store_settings, and the unused campaigns table.
-- Access is server-only (service role). No client write/read policies.

BEGIN;

CREATE TABLE IF NOT EXISTS public.homepage_hero_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  occasion text,
  display_mode text NOT NULL DEFAULT 'image_with_content',
  is_enabled boolean NOT NULL DEFAULT false,
  hero_image_url text NOT NULL,
  mobile_image_url text,
  heading text,
  subheading text,
  offer_text text,
  cta_text text,
  cta_url text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homepage_hero_campaigns_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT homepage_hero_campaigns_display_mode_check CHECK (
    display_mode IN ('image_only', 'image_with_content')
  ),
  CONSTRAINT homepage_hero_campaigns_schedule_check CHECK (ends_at > starts_at),
  CONSTRAINT homepage_hero_campaigns_hero_url_not_blank CHECK (length(btrim(hero_image_url)) > 0),
  CONSTRAINT homepage_hero_campaigns_hero_url_not_default_assets CHECK (
    hero_image_url NOT ILIKE '%/assets/hero/%'
  ),
  CONSTRAINT homepage_hero_campaigns_mobile_url_not_default_assets CHECK (
    mobile_image_url IS NULL
    OR (
      length(btrim(mobile_image_url)) > 0
      AND mobile_image_url NOT ILIKE '%/assets/hero/%'
    )
  ),
  CONSTRAINT homepage_hero_campaigns_heading_for_content CHECK (
    display_mode <> 'image_with_content'
    OR length(btrim(coalesce(heading, ''))) > 0
  ),
  CONSTRAINT homepage_hero_campaigns_cta_pair CHECK (
    (
      (cta_text IS NULL OR btrim(cta_text) = '')
      AND (cta_url IS NULL OR btrim(cta_url) = '')
    )
    OR (
      length(btrim(coalesce(cta_text, ''))) > 0
      AND length(btrim(coalesce(cta_url, ''))) > 0
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_homepage_hero_campaigns_active_window
  ON public.homepage_hero_campaigns (is_enabled, starts_at, ends_at, priority DESC);

ALTER TABLE public.homepage_hero_campaigns ENABLE ROW LEVEL SECURITY;

COMMIT;
