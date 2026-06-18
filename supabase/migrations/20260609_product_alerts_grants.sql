-- Ensure API roles can insert into product_alerts (RLS policy still applies)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT ON public.product_alerts TO anon, authenticated, service_role;

-- Reload PostgREST schema cache after manual table creation
NOTIFY pgrst, 'reload schema';
