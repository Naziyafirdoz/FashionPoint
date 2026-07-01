import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { RESEND_FROM_ALERTS_STORE } from "@/lib/server/resend-from-addresses";
import { buildDiscontinuedProductEmail } from "@/lib/stock-notifications/email-template";
import { buildBrowseProductsUrl } from "@/lib/stock-notifications/product-url";
import { resolveRequestRecipientEmail } from "@/lib/stock-notifications/request-email";
import { markStockRequestCancelled } from "@/lib/stock-notifications/request-status";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type DiscontinuedProductContext = {
  productId: string;
  productName: string;
  categorySlug?: string | null;
};

type PendingRequestRow = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  email?: string | null;
  product_name?: string | null;
  status: string;
};

async function loadPendingRequests(
  db: SupabaseClient,
  productId: string
): Promise<PendingRequestRow[]> {
  const { data, error } = await db
    .from("out_of_stock_requests")
    .select("id, customer_name, customer_email, product_name, status")
    .eq("product_id", productId)
    .eq("status", "pending");

  if (error) {
    console.error("[back-in-stock] failed to load pending requests for discontinued product", {
      productId,
      message: error.message
    });
    return [];
  }

  return (data ?? []) as PendingRequestRow[];
}

async function loadFreshRequest(
  db: SupabaseClient,
  requestId: string
): Promise<PendingRequestRow | null> {
  const { data, error } = await db
    .from("out_of_stock_requests")
    .select("id, customer_name, customer_email, product_name, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) {
    console.error("[back-in-stock] failed to reload request before discontinued email", {
      requestId,
      message: error?.message
    });
    return null;
  }

  return data as PendingRequestRow;
}

async function sendDiscontinuedEmailAndCancel(
  db: SupabaseClient,
  requestId: string,
  context: DiscontinuedProductContext
): Promise<void> {
  const fresh = await loadFreshRequest(db, requestId);
  if (!fresh || fresh.status !== "pending") return;

  const recipient = resolveRequestRecipientEmail(fresh);
  if (!recipient) {
    console.error("[back-in-stock] discontinued email skipped — no stored request email", {
      requestId
    });
    await markStockRequestCancelled(db, requestId, { reason: "discontinued" });
    return;
  }

  const productName = context.productName || fresh.product_name?.trim() || "this product";
  const browseUrl = buildBrowseProductsUrl(context.categorySlug);
  const { subject, html } = buildDiscontinuedProductEmail({
    customerName: fresh.customer_name,
    productName,
    browseUrl
  });

  if (resend) {
    try {
      await resend.emails.send({
        from: RESEND_FROM_ALERTS_STORE,
        to: recipient,
        subject,
        html
      });
    } catch (err) {
      console.error("[back-in-stock] discontinued email send failed", {
        requestId,
        to: recipient,
        message: err instanceof Error ? err.message : String(err)
      });
      return;
    }
  } else {
    console.warn("[back-in-stock] RESEND_API_KEY not configured — skipping discontinued email");
  }

  await markStockRequestCancelled(db, requestId, { reason: "discontinued" });
}

/**
 * Notify pending requesters when a product is permanently discontinued (archived/deleted).
 * Sends at most one email per pending request; never duplicates.
 */
export async function processDiscontinuedProductNotifications(
  db: SupabaseClient,
  context: DiscontinuedProductContext
): Promise<void> {
  const pending = await loadPendingRequests(db, context.productId);
  if (!pending.length) return;

  await Promise.all(
    pending.map((request) => sendDiscontinuedEmailAndCancel(db, request.id, context))
  );
}
