-- Allow admins to choose which active categories appear directly in the storefront navbar.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS show_in_navbar boolean NOT NULL DEFAULT false;
