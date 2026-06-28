-- Independent navbar ordering for featured categories (sort_order remains for site-wide category order).
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS navbar_position integer NULL;
