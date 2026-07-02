-- One review per customer, product, and delivered order line.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_product_order_unique
  ON public.reviews (user_id, product_id, order_id)
  WHERE order_id IS NOT NULL;

-- Enable Supabase Realtime for review moderation sync (storefront + admin).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
  END IF;
END $$;
