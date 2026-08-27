-- Additive optional promotional banner URL for admin-managed offers.
-- Existing rows remain valid with NULL. No targeting, RLS, or constraint changes.

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS banner_image_url text;

NOTIFY pgrst, 'reload schema';
