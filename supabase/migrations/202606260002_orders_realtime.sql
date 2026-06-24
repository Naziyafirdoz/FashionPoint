-- Enable Supabase Realtime for orders (customer My Orders auto-sync).
-- Does not alter table schema; adds orders to the realtime publication only.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;
