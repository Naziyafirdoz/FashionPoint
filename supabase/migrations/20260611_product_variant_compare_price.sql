-- Per-variant compare price for size/color pricing matrix
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS compare_price numeric;
