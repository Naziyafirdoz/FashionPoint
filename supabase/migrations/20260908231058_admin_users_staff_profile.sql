-- Staff profile fields on admin_users (Settings → Staff & Roles).
-- display_name / phone / email / is_active live on admin_users so staff
-- are not mixed into the customers (shopper) table.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_admin_users_role_active
  ON admin_users (role)
  WHERE is_active = true;

COMMENT ON COLUMN admin_users.display_name IS
  'Staff full name for admin UI (Settings → Staff & Roles, Delivery Boy dropdown).';

COMMENT ON COLUMN admin_users.phone IS
  'Staff mobile number for admin UI and Delivery Boy selection.';

COMMENT ON COLUMN admin_users.email IS
  'Staff login email (mirrors Auth user email for display).';

COMMENT ON COLUMN admin_users.is_active IS
  'When false, staff cannot be selected for new Delivery Boy assignments.';
