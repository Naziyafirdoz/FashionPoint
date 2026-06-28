-- Sub-categories under parent categories; optional link from products.
CREATE TABLE IF NOT EXISTS sub_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_slug ON sub_categories(slug);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sub_category_id uuid REFERENCES sub_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_sub_category_id ON products(sub_category_id);
