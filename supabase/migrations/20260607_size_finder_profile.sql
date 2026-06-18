-- Size Finder profile fields on customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS recommended_size text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fit_preference text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sizing_updated_at timestamptz;
