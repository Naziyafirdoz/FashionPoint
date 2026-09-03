import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAdminEmail } from "@/lib/admin/admin-contacts";
import { resolveNotificationRecipientEmails } from "@/lib/admin/notification-recipient-resolver";
import { getResendFromAlerts } from "@/lib/server/resend-from-addresses";
import { buildAdminBackInStockRequestEmail } from "@/lib/stock-notifications/email-template";
import { buildAdminBackInStockRequestsUrl, buildAdminInventoryUrl } from "@/lib/stock-notifications/product-url";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type BackInStockAdminNotifyInput = {
  requestId: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  requestedAt: string;
};

async function resolveAdminRecipients(db: SupabaseClient): Promise<string[]> {
  const fromSettings = await resolveNotificationRecipientEmails("low_stock", db);
  if (fromSettings.length > 0) return fromSettings;

  const admin = getAdminEmail();
  return admin ? [admin] : [];
}

export async function createBackInStockAdminNotification(
  db: SupabaseClient,
  input: BackInStockAdminNotifyInput
): Promise<void> {
  const { error } = await db.from("notifications").insert({
    order_id: null,
    type: "back_in_stock",
    recipient: "admin",
    title: "New Back-in-Stock Request",
    message: `${input.customerName} requested a notification for ${input.productName}.`,
    payload: {
      event: "back_in_stock_request",
      request_id: input.requestId,
      product_id: input.productId,
      product_name: input.productName,
      customer_name: input.customerName,
      customer_email: input.customerEmail
    },
    status: "active",
    is_read: false
  });

  if (error) {
    console.error("[back-in-stock] admin in-app notification failed", {
      requestId: input.requestId,
      message: error.message
    });
  }
}

export async function sendBackInStockAdminEmail(
  db: SupabaseClient,
  input: BackInStockAdminNotifyInput
): Promise<void> {
  if (!resend) {
    console.warn("[back-in-stock] RESEND_API_KEY not configured — skipping admin email");
    return;
  }

  const recipients = await resolveAdminRecipients(db);
  if (!recipients.length) {
    console.warn("[back-in-stock] no admin recipients configured for back-in-stock alert");
    return;
  }

  const requestsPageUrl = buildAdminBackInStockRequestsUrl();
  const { subject, html } = await buildAdminBackInStockRequestEmail({
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    productName: input.productName,
    requestedAt: input.requestedAt,
    inventoryUrl: buildAdminInventoryUrl(),
    requestsPageUrl
  });

  try {
    await resend.emails.send({
      from: await getResendFromAlerts(),
      to: recipients,
      subject,
      html
    });
  } catch (err) {
    console.error("[back-in-stock] admin email send failed", {
      requestId: input.requestId,
      message: err instanceof Error ? err.message : String(err)
    });
  }
}

export async function notifyAdminOfBackInStockRequest(
  db: SupabaseClient,
  input: BackInStockAdminNotifyInput
): Promise<void> {
  await Promise.allSettled([
    createBackInStockAdminNotification(db, input),
    sendBackInStockAdminEmail(db, input)
  ]);
}
