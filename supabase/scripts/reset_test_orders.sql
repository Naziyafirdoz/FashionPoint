-- =============================================================================
-- Fashion Point — SAFE DEVELOPMENT ORDER RESET
-- =============================================================================
--
-- PURPOSE
--   Delete all order-related rows for local / staging test cleanup.
--
-- SCOPE
--   • DELETE only (no TRUNCATE, no DROP, no schema changes)
--   • Touches: reviews (order-linked), return_requests, orders
--   • Optional corrective updates: inventory, customer denormalized stats, coupons
--
-- DOES NOT DELETE
--   products, product_variants, categories, users, auth.users, admins,
--   customers (rows), addresses, coupons (rows), settings, blogs, inventory rows
--
-- BEFORE RUNNING
--   1. Use a local or staging Supabase project — NOT production.
--   2. Run the full script once with ROLLBACK (dry run) at the bottom.
--   3. Re-run with COMMIT only after counts look correct.
--   4. Clear browser localStorage key `fashionpoint_admin_notifications` on admin UI.
--
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. PRE-DELETE COUNTS
-- -----------------------------------------------------------------------------
SELECT '=== PRE-DELETE COUNTS ===' AS section;

SELECT 'orders' AS table_name, COUNT(*)::bigint AS row_count FROM orders
UNION ALL
SELECT 'return_requests', COUNT(*) FROM return_requests
UNION ALL
SELECT 'reviews (all)', COUNT(*) FROM reviews
UNION ALL
SELECT 'reviews (order-linked)', COUNT(*) FROM reviews WHERE order_id IS NOT NULL
UNION ALL
SELECT 'reviews (no order link)', COUNT(*) FROM reviews WHERE order_id IS NULL
ORDER BY table_name;

SELECT status, COUNT(*)::bigint AS row_count
FROM orders
GROUP BY status
ORDER BY row_count DESC, status;

SELECT payment_status, COUNT(*)::bigint AS row_count
FROM orders
GROUP BY payment_status
ORDER BY row_count DESC, payment_status;

-- -----------------------------------------------------------------------------
-- 2. OPTIONAL CORRECTIVE UPDATES (configure flags below)
-- -----------------------------------------------------------------------------
--
-- restore_inventory
--   Orders deduct product_variants.stock_quantity at checkout (COD + prepaid).
--   Cancelling/deleting orders does NOT auto-restore stock in the app.
--   Set TRUE for dev reset so inventory matches deleted test orders.
--
-- reset_customer_stats
--   customers.total_orders / total_spent exist in schema but are NOT read or
--   written by the app (dashboard counts orders live). Set TRUE only if you
--   manually populated these columns and want them zeroed.
--
-- reset_coupon_counts
--   coupons.used_count is NOT updated by checkout in the current codebase.
--   Set TRUE only if you manually incremented used_count during testing.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  restore_inventory boolean := TRUE;
  reset_customer_stats boolean := TRUE;
  reset_coupon_counts boolean := TRUE;

  ord RECORD;
  item jsonb;
  pid uuid;
  item_size text;
  item_color text;
  item_qty integer;
  variant_id uuid;
  current_stock integer;
  restored_lines integer := 0;
BEGIN
  IF restore_inventory THEN
    RAISE NOTICE 'Restoring inventory from order line items…';

    FOR ord IN SELECT id, items FROM orders LOOP
      IF ord.items IS NULL OR jsonb_typeof(ord.items) <> 'array' THEN
        CONTINUE;
      END IF;

      FOR item IN SELECT value FROM jsonb_array_elements(ord.items) LOOP
        pid := NULLIF(COALESCE(item->>'productId', item->>'product_id'), '')::uuid;
        item_size := COALESCE(NULLIF(TRIM(item->>'size'), ''), '—');
        item_color := COALESCE(NULLIF(TRIM(item->>'color'), ''), '—');
        item_qty := GREATEST(1, COALESCE(NULLIF(item->>'quantity', '')::integer, 1));

        IF pid IS NULL THEN
          CONTINUE;
        END IF;

        SELECT pv.id, pv.stock_quantity
        INTO variant_id, current_stock
        FROM product_variants pv
        WHERE pv.product_id = pid
          AND pv.size = item_size
          AND pv.color = item_color
        LIMIT 1;

        IF variant_id IS NULL THEN
          RAISE NOTICE 'Skipped line (variant not found): product %, size %, color %',
            pid, item_size, item_color;
          CONTINUE;
        END IF;

        UPDATE product_variants
        SET stock_quantity = COALESCE(current_stock, 0) + item_qty
        WHERE id = variant_id;

        restored_lines := restored_lines + 1;
      END LOOP;
    END LOOP;

    UPDATE products p
    SET
      stock_quantity = COALESCE(v.total, 0),
      updated_at = now()
    FROM (
      SELECT product_id, SUM(stock_quantity)::integer AS total
      FROM product_variants
      GROUP BY product_id
    ) v
    WHERE p.id = v.product_id;

    RAISE NOTICE 'Inventory restoration complete (% line updates).', restored_lines;
  ELSE
    RAISE NOTICE 'Skipping inventory restoration (restore_inventory = FALSE).';
  END IF;

  IF reset_customer_stats THEN
    UPDATE customers
    SET
      total_orders = 0,
      total_spent = 0
    WHERE COALESCE(total_orders, 0) <> 0
       OR COALESCE(total_spent, 0) <> 0;

    RAISE NOTICE 'Customer denormalized stats reset.';
  END IF;

  IF reset_coupon_counts THEN
    UPDATE coupons
    SET used_count = 0
    WHERE COALESCE(used_count, 0) <> 0;

    RAISE NOTICE 'Coupon used_count reset.';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. DELETE ORDER-RELATED DATA (correct FK order)
-- -----------------------------------------------------------------------------
--
-- FK graph:
--   return_requests.order_id → orders(id) ON DELETE CASCADE
--   reviews.order_id         → orders(id) NO ACTION (must delete first)
--
-- Line items, shipping, refunds, invoices live on orders row (items JSONB + columns).
-- -----------------------------------------------------------------------------

DELETE FROM reviews
WHERE order_id IS NOT NULL;

DELETE FROM return_requests;

DELETE FROM orders;

-- -----------------------------------------------------------------------------
-- 4. POST-DELETE VERIFICATION (expect all zeros)
-- -----------------------------------------------------------------------------
SELECT '=== POST-DELETE COUNTS (expect 0) ===' AS section;

SELECT 'orders' AS table_name, COUNT(*)::bigint AS row_count FROM orders
UNION ALL
SELECT 'return_requests', COUNT(*) FROM return_requests
UNION ALL
SELECT 'reviews (order-linked)', COUNT(*) FROM reviews WHERE order_id IS NOT NULL
ORDER BY table_name;

-- Sanity: non-order reviews (if any) should remain untouched
SELECT 'reviews (no order link, preserved)' AS note, COUNT(*)::bigint AS row_count
FROM reviews
WHERE order_id IS NULL;

-- -----------------------------------------------------------------------------
-- 5. DRY RUN vs FINAL EXECUTION
-- -----------------------------------------------------------------------------
--
-- DRY RUN (recommended first):
--   Leave ROLLBACK uncommented below. Review pre/post counts in the output.
--   Nothing is persisted.
--
-- FINAL EXECUTION:
--   Comment out ROLLBACK and uncomment COMMIT.
--
-- -----------------------------------------------------------------------------

ROLLBACK;
-- COMMIT;
