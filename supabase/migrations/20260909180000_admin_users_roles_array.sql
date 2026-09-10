-- Multi-role support on admin_users (additive, non-destructive).
-- roles becomes the source of truth; legacy role is preserved and kept in sync by app writes.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS roles text[];

-- Backfill from legacy single role column.
UPDATE admin_users
SET roles = ARRAY[lower(trim(role))]::text[]
WHERE (roles IS NULL OR cardinality(roles) = 0)
  AND role IS NOT NULL
  AND trim(role) <> '';

-- Fallback for any remaining empty rows.
UPDATE admin_users
SET roles = ARRAY['admin']::text[]
WHERE roles IS NULL OR cardinality(roles) = 0;

COMMENT ON COLUMN admin_users.roles IS
  'Staff capability roles (owner|admin|worker|delivery_worker). Source of truth for authorization.';

CREATE INDEX IF NOT EXISTS idx_admin_users_roles_gin
  ON admin_users USING GIN (roles);
