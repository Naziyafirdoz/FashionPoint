import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isOwnerOrAdmin, parseRolesFromRow } from "@/lib/admin/staff";
import { normalizeLegacyStatus } from "@/lib/orders/status-config";
import { emailAppUrl } from "@/lib/server/notifications/email-app-url";
import {
  htmlResponse,
  renderAlreadyDeliveredPage,
  renderDeliveryForbiddenPage,
  renderDeliveryNotEligiblePage,
  renderInvalidTokenPage,
  renderTokenExpiredPage,
  renderTokenUsedPage
} from "@/lib/server/notifications/email-action-pages";
import { logTokenValidationFailure } from "@/lib/server/order-actions/token-audit";
import { getRequestMeta } from "@/lib/server/order-actions/request-meta";
import {
  lookupActionToken,
  normalizeReceivedToken,
  validateActionToken
} from "@/lib/server/order-actions/tokens";
import type { Order } from "@/types";

/**
 * Secure email CTA for Delivery Assigned → opens OTP verify UI.
 * Does NOT mark the order delivered. Reuses existing session + verify-delivery API.
 */
export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const rawToken = requestUrl.searchParams.get("token");
  const token = rawToken ? normalizeReceivedToken(rawToken) : "";
  const db = createServiceClient();
  if (!db) {
    console.error("[order-actions/mark-delivery] service client unavailable");
    return htmlResponse(await renderInvalidTokenPage());
  }

  const meta = getRequestMeta(req);

  if (!token) {
    return htmlResponse(await renderInvalidTokenPage());
  }

  const lookup = await lookupActionToken(db, token);
  const validation = await validateActionToken(db, token, "mark_delivery");
  if (!validation.ok) {
    await logTokenValidationFailure(db, validation.failure, meta);

    if (validation.failure.reason === "used" && validation.failure.record?.order_id) {
      const { data: order } = await db
        .from("orders")
        .select("status, order_number")
        .eq("id", validation.failure.record.order_id)
        .maybeSingle();
      if (normalizeLegacyStatus(String(order?.status ?? "")) === "delivered") {
        return htmlResponse(
          await renderAlreadyDeliveredPage(
            typeof order?.order_number === "string" ? order.order_number : undefined
          )
        );
      }
      return htmlResponse(await renderTokenUsedPage());
    }

    if (validation.failure.reason === "expired") {
      return htmlResponse(await renderTokenExpiredPage());
    }

    return htmlResponse(await renderInvalidTokenPage());
  }

  const orderId = validation.record.order_id;
  const { data: existing, error: fetchError } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError || !existing) {
    return htmlResponse(await renderInvalidTokenPage());
  }

  const order = existing as Order;
  const status = normalizeLegacyStatus(order.status);

  if (status === "delivered") {
    return htmlResponse(await renderAlreadyDeliveredPage(order.order_number));
  }

  if (
    status === "cancelled" ||
    status === "cancellation_approved" ||
    status === "cancel_requested" ||
    String(order.status).toLowerCase().includes("cancel")
  ) {
    return htmlResponse(
      await renderDeliveryNotEligiblePage("This order is cancelled and cannot be marked delivered.")
    );
  }

  if (order.fulfillment_method === "rapido" || order.fulfillment_method === "dtdc") {
    return htmlResponse(
      await renderDeliveryNotEligiblePage(
        "Courier orders (Rapido/DTDC) are not completed with delivery OTP."
      )
    );
  }

  if (order.fulfillment_method !== "delivery_boy") {
    return htmlResponse(
      await renderDeliveryNotEligiblePage("OTP verification is only for Delivery Staff orders.")
    );
  }

  if (status !== "out_for_delivery") {
    return htmlResponse(
      await renderDeliveryNotEligiblePage(
        "This order is not out for delivery, so delivery confirmation is unavailable."
      )
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL(emailAppUrl("/admin/login"));
    const returnPath = `/api/order-actions/mark-delivery?token=${encodeURIComponent(token)}`;
    login.searchParams.set("redirect", returnPath);
    return NextResponse.redirect(login);
  }

  const { data: staffRow } = await db
    .from("admin_users")
    .select("user_id, role, roles, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!staffRow || (staffRow as { is_active?: boolean }).is_active === false) {
    return htmlResponse(
      await renderDeliveryForbiddenPage(
        "Sign in with the assigned delivery staff account to confirm this delivery."
      )
    );
  }

  const roles = parseRolesFromRow(staffRow as Record<string, unknown>);
  const assigned = (order.assigned_delivery_worker_id ?? "").trim();
  const isAssignee = assigned === user.id;
  const elevated = isOwnerOrAdmin(roles);

  if (!elevated && !isAssignee) {
    return htmlResponse(
      await renderDeliveryForbiddenPage(
        "This delivery is assigned to another staff member. You cannot mark it delivered."
      )
    );
  }

  // Token proves the email link; session proves the staff identity.
  // OTP verification still required on the Delivery page (does not deliver here).
  const deliveryUrl = new URL(emailAppUrl("/admin/delivery"));
  deliveryUrl.searchParams.set("mark", orderId);
  // Keep token in query so the Delivery page can consume it after successful OTP (optional).
  deliveryUrl.searchParams.set("t", token);

  console.info("[order-actions/mark-delivery] redirect to delivery verify UI", {
    orderId,
    userId: user.id,
    tokenId: validation.record.id,
    lookupId: lookup?.id ?? null
  });

  return NextResponse.redirect(deliveryUrl);
}

export async function POST() {
  return NextResponse.json({ error: "Use GET with token" }, { status: 405 });
}
