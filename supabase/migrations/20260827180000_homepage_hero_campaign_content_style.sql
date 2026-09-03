-- Additive nullable content design JSON for homepage campaign heroes.
-- Does not recreate homepage_hero_campaigns or backfill existing rows.

BEGIN;

ALTER TABLE public.homepage_hero_campaigns
  ADD COLUMN IF NOT EXISTS content_style jsonb;

COMMIT;
