import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { RESEND_FROM_ALERTS_STORE } from "@/lib/server/resend-from-addresses";
import { buildBackInStockEmail } from "./email-template";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function processBackInStockNotifications(
  db: SupabaseClient,
  productId: string,
  productName: string,
  productSlug: string
): Promise<void> {
  const { data: pending, error } = await db
    .from("out_of_stock_requests")
    .select("id, customer_name, customer_email, status")
    .eq("product_id", productId)
    .eq("status", "pending");

  if (error || !pending?.length) {
    if (error) {
      console.error("[back-in-stock] failed to load pending notifications", {
        productId,
        message: error.message
      });
    }
    return;
  }

  for (const request of pending) {
    if (request.status !== "pending") continue;

    const sent = await sendBackInStockEmail({
      to: request.customer_email,
      customerName: request.customer_name,
      productName,
      productSlug
    });

    if (!sent) continue;

    const notifiedAt = new Date().toISOString();
    const { error: updateError } = await db
      .from("out_of_stock_requests")
      .update({
        status: "sent",
        notified_at: notifiedAt
      })
      .eq("id", request.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("[back-in-stock] failed to mark notification sent", {
        id: request.id,
        message: updateError.message
      });
    }
  }
}

async function sendBackInStockEmail(params: {
  to: string;
  customerName: string;
  productName: string;
  productSlug: string;
}): Promise<boolean> {
  if (!resend) {
    console.warn("[back-in-stock] RESEND_API_KEY not configured — skipping email");
    return false;
  }

  const { subject, html } = buildBackInStockEmail({
    customerName: params.customerName,
    productName: params.productName,
    productSlug: params.productSlug
  });

  try {
    await resend.emails.send({
      from: RESEND_FROM_ALERTS_STORE,
      to: params.to,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error("[back-in-stock] email send failed", {
      to: params.to,
      message: err instanceof Error ? err.message : String(err)
    });
    return false;
  }
}
