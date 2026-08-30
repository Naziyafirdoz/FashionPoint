-- Additive: allow ongoing offers with no end date.
-- Existing limited-time rows keep starts_at/ends_at unchanged.
-- Does not add schedule_type or rewrite offer data.

BEGIN;

ALTER TABLE public.offers
  ALTER COLUMN ends_at DROP NOT NULL;

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_schedule_check;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_schedule_check
  CHECK (ends_at IS NULL OR ends_at > starts_at);

COMMIT;

NOTIFY pgrst, 'reload schema';
