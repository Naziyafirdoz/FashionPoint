-- Seed default Fashion Point categories (schema uses is_active, not active)
INSERT INTO categories (name, slug, sort_order, is_active) VALUES
  ('Daily Wear Blouses', 'daily-wear', 1, true),
  ('Designer Wear Blouses', 'designer-wear', 2, true),
  ('Party Wear Blouses', 'party-wear', 3, true),
  ('Soon', 'soon', 4, false)
ON CONFLICT (slug) DO NOTHING;
