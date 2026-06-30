-- Database-driven product color swatches: name + hex per color.
-- Keeps existing products.colors text[] for variant keys and backward compatibility.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS color_swatches jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.color_swatches IS
  'Array of { "name": string, "hex": string | null } for storefront color swatches.';
