import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { isValidEmail } from "@/lib/checkout/contact-validation";
import { getProductCategorySlug } from "@/lib/stock-notifications/discontinued-trigger";
import { buildManualCancellationEmail } from "@/lib/stock-notifications/email-template";
import { buildBrowseProductsUrl } from "@/lib/stock-notifications/product-url";
import { markStockRequestCancelled } from "@/lib/stock-notifications/request-status";
import { getResendFromAlertsStore } from "@/lib/server/resend-from-addresses";

const LOG_PREFIX = "[back-in-stock] manual cancel";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type StockRequestRow = {
  id: string;
  product_id: string;
  product_name: string | null;
  customer_name: string;
  customer_email: string | null;
  status: string;
};

export type ManualCancelResult =
  | { ok: true }
  | { ok: false; message: string };

function resolveStoredCustomerEmail(customerEmail: string | null | undefined): string | null {
  const stored = customerEmail?.trim().toLowerCase() || "";
  if (!stored) return null;
  return isValidEmail(stored) ? stored : null;
}

async function loadRequest(
  db: SupabaseClient,
  requestId: string
): Promise<StockRequestRow | null> {
  const { data, error } = await db
    .from("out_of_stock_requests")
    .select("id, product_id, product_name, customer_name, customer_email, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error || !data) {
    console.error(`${LOG_PREFIX} — request lookup failed`, {
      requestId,
      message: error?.message
    });
    return null;
  }

  return data as StockRequestRow;
}

async function sendManualCancellationEmail(params: {
  requestId: string;
  recipient: string;
  customerName: string;
  productName: string;
  browseUrl: string;
}): Promise<void> {
  const { subject, html } = await buildManualCancellationEmail({
    customerName: params.customerName,
    productName: params.productName,
    browseUrl: params.browseUrl
  });

  console.info(`${LOG_PREFIX} — sending email`, {
    requestId: params.requestId,
    customerEmail: params.recipient,
    productName: params.productName,
    subject
  });

  if (!resend) {
    console.warn(`${LOG_PREFIX} — RESEND_API_KEY not configured, email skipped`, {
      requestId: params.requestId,
      customerEmail: params.recipient,
      productName: params.productName,
      subject
    });
    return;
  }

  try {
    const response = await resend.emails.send({
      from: await getResendFromAlertsStore(),
      to: params.recipient,
      subject,
      html
    });

    console.info(`${LOG_PREFIX} — email sent successfully`, {
      requestId: params.requestId,
      customerEmail: params.recipient,
      productName: params.productName,
      subject,
      resendResponse: response
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} — email send failed`, {
      requestId: params.requestId,
      customerEmail: params.recipient,
      productName: params.productName,
      subject,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}

/**
 * Admin manual cancellation: update request, then email the stored customer address.
 * Never sends duplicate emails for already-cancelled requests.
 */
export async function cancelBackInStockRequestManually(
  db: SupabaseClient,
  requestId: string
): Promise<ManualCancelResult> {
  console.info(`${LOG_PREFIX} — started`, { requestId });

  const request = await loadRequest(db, requestId);
  if (!request) {
    return { ok: false, message: "Request not found." };
  }

  if (request.status === "cancelled") {
    console.info(`${LOG_PREFIX} — already cancelled, skipping email`, { requestId });
    return { ok: true };
  }

  if (request.status !== "pending") {
    console.warn(`${LOG_PREFIX} — cannot cancel non-pending request`, {
      requestId,
      status: request.status
    });
    return { ok: false, message: "Only pending requests can be cancelled." };
  }

  const cancelled = await markStockRequestCancelled(db, requestId, {
    reason: "manual_cancel"
  });

  if (!cancelled) {
    console.error(`${LOG_PREFIX} — database update failed`, { requestId });
    return { ok: false, message: "Unable to cancel request." };
  }

  const fresh = await loadRequest(db, requestId);
  if (!fresh || fresh.status !== "cancelled") {
    console.error(`${LOG_PREFIX} — post-cancel re-fetch failed or unexpected status`, {
      requestId,
      status: fresh?.status
    });
    return { ok: true };
  }

  const recipient = resolveStoredCustomerEmail(fresh.customer_email);
  if (!recipient) {
    console.error(`${LOG_PREFIX} — email skipped, no valid stored customer_email`, {
      requestId,
      productName: fresh.product_name
    });
    return { ok: true };
  }

  const { data: product } = await db
    .from("products")
    .select("category_id")
    .eq("id", fresh.product_id)
    .maybeSingle();

  const categorySlug = await getProductCategorySlug(db, product?.category_id);
  const productName = fresh.product_name?.trim() || "your requested product";
  const browseUrl = buildBrowseProductsUrl(categorySlug);

  await sendManualCancellationEmail({
    requestId,
    recipient,
    customerName: fresh.customer_name,
    productName,
    browseUrl
  });

  console.info(`${LOG_PREFIX} — completed`, {
    requestId,
    customerEmail: recipient,
    productName
  });

  return { ok: true };
}
