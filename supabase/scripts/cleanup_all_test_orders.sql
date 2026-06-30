-- =============================================================================
-- Fashion Point — SAFE ORDER DATA CLEANUP (all test orders)
-- =============================================================================
-- Scope: DELETE order-related rows only. Single transaction. No schema changes.
-- Child tables first; reviews deleted before orders (NO ACTION FK).
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
  DELETE FROM reviews WHERE order_id IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('reviews (order-linked)', n);

  DELETE FROM notification_logs
  WHERE order_id IS NOT NULL AND btrim(order_id) <> '';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('notification_logs (order-linked)', n);

  DELETE FROM notifications
  WHERE order_id IS NOT NULL AND btrim(order_id) <> '';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO _cleanup_deleted VALUES ('notifications', n);

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
END $$;

SELECT '=== DELETED ROW COUNTS ===' AS section;
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
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'notification_logs (order-linked)', COUNT(*) FROM notification_logs
  WHERE order_id IS NOT NULL AND btrim(order_id) <> ''
ORDER BY table_name;

SELECT 'notification_logs (preserved, no order link)' AS note,
  COUNT(*)::bigint AS row_count
FROM notification_logs
WHERE order_id IS NULL OR btrim(order_id) = '';

SELECT 'reviews (preserved, no order link)' AS note,
  COUNT(*)::bigint AS row_count
FROM reviews
WHERE order_id IS NULL;

COMMIT;
