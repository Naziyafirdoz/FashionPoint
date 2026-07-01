-- =============================================================================
-- Fashion Point — SAFE ORDER DATA CLEANUP (all orders)
-- =============================================================================
-- Scope: DELETE order-related rows only. Single transaction. No schema changes.
--
-- AFFECTED TABLES (order-exclusive or order-linked):
--   notification_logs (order-linked rows only)
--   notifications (order-linked rows only; preserves back_in_stock)
--   order_action_logs, action_tokens, order_notification_log, order_reminders
--   return_requests, orders
--   reviews: order_id unlinked (rows preserved per product-review policy)
--
-- NOT TOUCHED:
--   products, product_variants, categories, customers (rows), addresses,
--   wishlist, coupons, out_of_stock_requests, auth.users, settings, inventory
-- =============================================================================

BEGIN;

CREATE TEMP TABLE _cleanup_deleted (
  table_name text PRIMARY KEY,
  deleted_count bigint NOT NULL DEFAULT 0
) ON COMMIT DROP;

DO $$
DECLARE
  n bigint;
BEGIN
  -- Unlink reviews (preserve review rows; FK is NO ACTION on orders)
  UPDATE reviews SET order_id = NULL WHERE order_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('reviews (order_id unlinked)', n);

  DELETE FROM notification_logs WHERE order_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('notification_logs (order-linked)', n);

  DELETE FROM notifications WHERE order_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('notifications (order-linked)', n);

  DELETE FROM order_action_logs;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('order_action_logs', n);

  DELETE FROM action_tokens;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('action_tokens', n);

  DELETE FROM order_notification_log;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('order_notification_log', n);

  DELETE FROM order_reminders;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('order_reminders', n);

  DELETE FROM return_requests;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('return_requests', n);

  DELETE FROM orders;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('orders', n);

  -- Denormalized customer stats (not used by live dashboard counts, but zero for consistency)
  UPDATE customers
  SET total_orders = 0, total_spent = 0
  WHERE COALESCE(total_orders, 0) <> 0 OR COALESCE(total_spent, 0) <> 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('customers (stats reset)', n);
END $$;

SELECT '=== DELETED / UPDATED ROW COUNTS ===' AS section;
SELECT table_name, deleted_count FROM _cleanup_deleted ORDER BY table_name;

SELECT '=== POST-DELETE VERIFICATION (expect 0) ===' AS section;

SELECT 'orders' AS table_name, COUNT(*)::bigint AS row_count FROM orders
UNION ALL
SELECT 'return_requests', COUNT(*) FROM return_requests
UNION ALL
SELECT 'reviews (order-linked)', COUNT(*) FROM reviews WHERE order_id IS NOT NULL
UNION ALL
SELECT 'action_tokens', COUNT(*) FROM action_tokens
UNION ALL
SELECT 'order_action_logs', COUNT(*) FROM order_action_logs
UNION ALL
SELECT 'order_reminders', COUNT(*) FROM order_reminders
UNION ALL
SELECT 'order_notification_log', COUNT(*) FROM order_notification_log
UNION ALL
SELECT 'notifications (order-linked)', COUNT(*) FROM notifications WHERE order_id IS NOT NULL
UNION ALL
SELECT 'notification_logs (order-linked)', COUNT(*) FROM notification_logs WHERE order_id IS NOT NULL
ORDER BY table_name;

SELECT 'notifications (preserved, no order link)' AS note,
  COUNT(*)::bigint AS row_count
FROM notifications
WHERE order_id IS NULL;

SELECT 'reviews (preserved total)' AS note,
  COUNT(*)::bigint AS row_count
FROM reviews;

COMMIT;
