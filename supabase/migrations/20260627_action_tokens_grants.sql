-- action_tokens / order_action_logs are server-only (API routes use service role).
-- Without explicit grants, PostgREST cannot read/write rows even with the service key.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.action_tokens TO service_role;
GRANT SELECT, INSERT ON public.order_action_logs TO service_role;
