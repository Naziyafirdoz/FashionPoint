-- Allow secure "Mark Delivery" email action tokens (same table as approve/remind).
-- Additive only: widen action_type check; no data loss.

ALTER TABLE public.action_tokens
  DROP CONSTRAINT IF EXISTS action_tokens_action_type_check;

ALTER TABLE public.action_tokens
  ADD CONSTRAINT action_tokens_action_type_check
  CHECK (action_type IN ('approve', 'remind', 'mark_delivery'));

COMMENT ON COLUMN public.action_tokens.action_type IS
  'approve | remind | mark_delivery — email action buttons; mark_delivery opens OTP verify UI only.';
