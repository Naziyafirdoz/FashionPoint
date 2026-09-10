import type { SupabaseClient } from "@supabase/supabase-js";
import { isDeliveryAssignableStaff, parseRolesFromRow } from "@/lib/admin/staff";
import {
  logCustomerEmailDelivery,
  wasCustomerEmailSent
} from "@/lib/server/notifications/customer-email-dedup";
import { renderCustomerOrderEmailFromTemplate } from "@/lib/server/notifications/email-template-system";
import { createMarkDeliveryActionUrl } from "@/lib/server/order-actions/tokens";
import { getResendFromOrders } from "@/lib/server/resend-from-addresses";
import {
  loadDeliveryAssignedEmailEnabled,
  loadEmailNotificationsEnabled
} from "@/lib/settings/notification-recipients-store";
import { createServiceClient } from "@/lib/supabase";
import type { Order } from "@/types";

/** Base event name; per-worker suffix allows Worker B to get mail after A→B reassignment. */
export const DELIVERY_ASSIGNED_EVENT_PREFIX = "delivery_assigned";

/** @deprecated Use DELIVERY_ASSIGNED_EVENT_PREFIX */
export const DELIVERY_WORKER_ASSIGNED_EVENT_PREFIX = DELIVERY_ASSIGNED_EVENT_PREFIX;

export function deliveryAssignedLogEvent(workerUserId: string): string {
  return `${DELIVERY_ASSIGNED_EVENT_PREFIX}:${workerUserId}`;
}

/** @deprecated Use deliveryAssignedLogEvent */
export function deliveryWorkerAssignedLogEvent(workerUserId: string): string {
  return deliveryAssignedLogEvent(workerUserId);
}

async function resolveWorkerEmail(
  db: SupabaseClient,
  workerUserId: string,
  profileEmail: string | null | undefined
): Promise<{ email: string; displayName: string; roles: unknown; role?: string; is_active?: boolean } | null> {
  const fromProfile = (profileEmail ?? "").trim().toLowerCase();
  let displayName = "";

  const withRoles = await db
    .from("admin_users")
    .select("display_name, email, phone, role, roles, is_active")
    .eq("user_id", workerUserId)
    .maybeSingle();

  let profile = withRoles.data as Record<string, unknown> | null;
  if (withRoles.error) {
    const legacy = await db
      .from("admin_users")
      .select("display_name, email, phone, role, is_active")
      .eq("user_id", workerUserId)
      .maybeSingle();
    profile = (legacy.data as Record<string, unknown> | null) ?? null;
  }

  displayName =
    (typeof profile?.display_name === "string" && profile.display_name.trim()) ||
    (typeof profile?.email === "string" && profile.email.trim()) ||
    (typeof profile?.phone === "string" && profile.phone.trim()) ||
    "";

  const emailFromRow =
    fromProfile ||
    (typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "");

  if (emailFromRow && emailFromRow.includes("@")) {
    return {
      email: emailFromRow,
      displayName: displayName || emailFromRow,
      roles: profile?.roles,
      role: typeof profile?.role === "string" ? profile.role : undefined,
      is_active: profile?.is_active !== false
    };
  }

  const { data: authUserData, error: authError } = await db.auth.admin.getUserById(workerUserId);
  if (authError) {
    console.error("[delivery-assigned] auth email lookup failed", {
      workerUserId,
      message: authError.message
    });
    return null;
  }

  const authEmail = (authUserData.user?.email ?? "").trim().toLowerCase();
  if (!authEmail || !authEmail.includes("@")) {
    return null;
  }

  const meta = authUserData.user?.user_metadata as Record<string, unknown> | undefined;
  const metaName =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";

  return {
    email: authEmail,
    displayName: displayName || metaName || authEmail,
    roles: profile?.roles,
    role: typeof profile?.role === "string" ? profile.role : undefined,
    is_active: profile?.is_active !== false
  };
}

/**
 * Notify the assigned delivery staff after a successful assign-delivery update.
 * Recipient = that staff member's Staff/Auth login email (never admin recipient list).
 * Never throws for missing email / Resend issues — logs instead; assignment stays saved.
 * Dedup is per order + worker so A→B reassignment notifies B only.
 */
export async function notifyDeliveryWorkerAssigned(params: {
  order: Order;
  workerUserId: string;
  /** Optional email already loaded from admin_users (avoids an extra round-trip). */
  profileEmail?: string | null;
  db?: SupabaseClient | null;
}): Promise<"sent" | "skipped" | "failed"> {
  const db = params.db ?? createServiceClient();
  const workerUserId = params.workerUserId.trim();
  const logEvent = deliveryAssignedLogEvent(workerUserId);

  if (!db) {
    console.error("[delivery-assigned] DB client unavailable", {
      orderId: params.order.id,
      workerUserId
    });
    return "failed";
  }

  const [globalEnabled, deliveryAssignedEnabled] = await Promise.all([
    loadEmailNotificationsEnabled(db),
    loadDeliveryAssignedEmailEnabled(db)
  ]);

  if (!globalEnabled || !deliveryAssignedEnabled) {
    console.info("[delivery-assigned] skipped — notifications disabled", {
      orderId: params.order.id,
      workerUserId,
      globalEnabled,
      deliveryAssignedEnabled
    });
    return "skipped";
  }

  if (await wasCustomerEmailSent(db, params.order.id, logEvent)) {
    return "skipped";
  }

  // Also skip legacy event key from earlier implementation (same worker).
  const legacyEvent = `delivery_worker_assigned:${workerUserId}`;
  if (
    legacyEvent !== logEvent &&
    (await wasCustomerEmailSent(db, params.order.id, legacyEvent))
  ) {
    return "skipped";
  }

  const resolved = await resolveWorkerEmail(db, workerUserId, params.profileEmail);
  if (!resolved) {
    console.error("[delivery-assigned] no valid worker email", {
      orderId: params.order.id,
      workerUserId
    });
    await logCustomerEmailDelivery(db, {
      orderId: params.order.id,
      event: logEvent,
      success: false,
      errorMessage: "Delivery staff email not found"
    });
    return "failed";
  }

  if (
    !isDeliveryAssignableStaff({
      role: resolved.role,
      roles: resolved.roles ?? parseRolesFromRow({ role: resolved.role }),
      is_active: resolved.is_active !== false
    })
  ) {
    console.error("[delivery-assigned] assigned user is not delivery-eligible", {
      orderId: params.order.id,
      workerUserId
    });
    await logCustomerEmailDelivery(db, {
      orderId: params.order.id,
      event: logEvent,
      success: false,
      errorMessage: "Assigned staff is not delivery-eligible"
    });
    return "failed";
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("[delivery-assigned] RESEND_API_KEY not configured", {
      orderId: params.order.id,
      workerUserId
    });
    await logCustomerEmailDelivery(db, {
      orderId: params.order.id,
      event: logEvent,
      success: false,
      errorMessage: "RESEND_API_KEY not configured"
    });
    return "failed";
  }

  try {
    const markDeliveryUrl = await createMarkDeliveryActionUrl(db, params.order.id);
    if (!markDeliveryUrl) {
      console.error("[delivery-assigned] unable to create Mark Delivery action token", {
        orderId: params.order.id,
        workerUserId
      });
    }

    const template = await renderCustomerOrderEmailFromTemplate(
      "delivery_assigned",
      params.order,
      {
        db,
        deliveryStaffName: resolved.displayName,
        markDeliveryUrl
      }
    );

    console.log("[delivery-assigned] template source", {
      orderId: params.order.id,
      workerUserId,
      to: resolved.email,
      source: template.source
    });

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: await getResendFromOrders(),
      to: resolved.email,
      subject: template.subject,
      html: template.html
    });

    await logCustomerEmailDelivery(db, {
      orderId: params.order.id,
      event: logEvent,
      success: true
    });
    return "sent";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[delivery-assigned] Delivery assignment succeeded but Delivery Assigned notification email failed.",
      {
        orderId: params.order.id,
        workerUserId,
        message
      }
    );
    await logCustomerEmailDelivery(db, {
      orderId: params.order.id,
      event: logEvent,
      success: false,
      errorMessage: message
    });
    return "failed";
  }
}
