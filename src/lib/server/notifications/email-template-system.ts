import type { SupabaseClient } from "@supabase/supabase-js";
import {
  customerName,
  customerPhone,
  formatCurrency,
  formatOrderDate,
  paymentMethodLabel,
  paymentStatusLabel
} from "@/lib/orders/admin-orders";
import { normalizeOrderItems } from "@/lib/orders/order-items";
import {
  courierLabelForMethod,
  isFulfillmentMethod
} from "@/lib/orders/fulfillment-method";
import { emailAppUrl } from "@/lib/server/notifications/email-app-url";
import {
  DEFAULT_EMAIL_TEMPLATES,
  defaultTemplateForEvent
} from "@/lib/server/notifications/email-template-defaults";
import { getStoreInformation } from "@/lib/settings/store-information";
import {
  EMAIL_TEMPLATE_EVENTS,
  isEmailTemplateEventKey,
  type EmailTemplateEventKey,
  type EmailTemplateRow,
  type OrderEmailTemplateVars
} from "@/lib/settings/email-templates";
import { STORE_NAME } from "@/lib/site-config";
import { createServiceClient } from "@/lib/supabase";
import type { Order } from "@/types";

const HTML_SAFE_KEYS = new Set([
  "items_html",
  "delivery_address_html",
  "my_orders_url",
  "delivery_orders_url",
  "tracking_number_line",
  "mark_delivery_url"
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function applyEmailTemplateVariables(
  template: string,
  vars: OrderEmailTemplateVars
): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const value = vars[key] ?? "";
    if (HTML_SAFE_KEYS.has(key)) return value;
    return escapeHtml(value);
  });
}

function formatAddressPlain(order: Order): string {
  const a = order.shipping_address;
  if (!a) return "—";
  const parts = [
    a.name,
    a.house_flat || a.address_line1,
    a.street || a.address_line2,
    a.landmark,
    [a.city, a.state].filter(Boolean).join(", "),
    a.pincode || a.postal_code,
    a.phone ? `Phone: ${a.phone}` : null
  ].filter((part): part is string => typeof part === "string" && Boolean(part.trim()));
  return parts.length ? parts.join("\n") : "—";
}

function itemsHtmlForOrder(order: Order): string {
  const lines = normalizeOrderItems(order.items);
  if (!lines.length) {
    return `<p style="margin:0;font-size:14px;color:#5C5C5C;">No items on this order.</p>`;
  }
  const rows = lines
    .map((line, index) => {
      const border =
        index < lines.length - 1
          ? "padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid #E8E0DA;"
          : "";
      return `<div style="${border}">
        <p style="margin:0 0 4px;font-size:15px;font-weight:600;">${escapeHtml(line.name)}</p>
        <p style="margin:0 0 2px;font-size:13px;color:#5C5C5C;">Size: ${escapeHtml(line.size || "—")} · Color: ${escapeHtml(line.color || "—")}</p>
        <p style="margin:0;font-size:13px;color:#5C5C5C;">Qty ${line.quantity} · ${escapeHtml(formatCurrency(line.price * line.quantity))}</p>
      </div>`;
    })
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;"><tr><td style="padding:16px;">${rows}</td></tr></table>`;
}

function deliveryMethodLabel(order: Order): string {
  if (isFulfillmentMethod(order.fulfillment_method)) {
    return courierLabelForMethod(order.fulfillment_method);
  }
  return "—";
}

export async function buildOrderEmailTemplateVars(
  order: Order,
  options?: {
    deliveryStaffName?: string | null;
    db?: SupabaseClient | null;
    markDeliveryUrl?: string | null;
  }
): Promise<OrderEmailTemplateVars> {
  const store = await getStoreInformation();
  const storeName = store.storeName.trim() || STORE_NAME;
  const addressPlain = formatAddressPlain(order);

  let deliveryStaffName = options?.deliveryStaffName?.trim() || "";
  if (!deliveryStaffName && order.assigned_delivery_worker_id && options?.db) {
    const { data } = await options.db
      .from("admin_users")
      .select("display_name, email, phone")
      .eq("user_id", order.assigned_delivery_worker_id)
      .maybeSingle();
    deliveryStaffName =
      (typeof data?.display_name === "string" && data.display_name.trim()) ||
      (typeof data?.email === "string" && data.email.trim()) ||
      (typeof data?.phone === "string" && data.phone.trim()) ||
      "";
  }

  const tracking = (order.tracking_number || order.tracking_id || "").trim();
  const trackingNumberLine = tracking
    ? `<p style="margin:0;font-size:14px;"><strong>Tracker Number</strong> ${escapeHtml(tracking)}</p>`
    : "";

  const phone = customerPhone(order);
  const phoneDisplay = phone && phone !== "—" ? phone : "—";

  return {
    customer_name: customerName(order),
    customer_phone: phoneDisplay,
    order_number: order.order_number || order.id,
    order_date: formatOrderDate(order.created_at || new Date().toISOString()),
    amount: formatCurrency(Number(order.total ?? 0)),
    payment_method: paymentMethodLabel(order.payment_method),
    payment_status: paymentStatusLabel(order.payment_status),
    delivery_address: addressPlain,
    delivery_address_html: escapeHtml(addressPlain).replace(/\n/g, "<br/>"),
    delivery_method: deliveryMethodLabel(order),
    delivery_staff_name: deliveryStaffName || "—",
    tracking_number: tracking || "—",
    tracking_number_line: trackingNumberLine,
    delivery_otp: (order.delivery_otp || "").trim() || "—",
    store_name: storeName,
    items_html: itemsHtmlForOrder(order),
    my_orders_url: emailAppUrl("/account/orders"),
    delivery_orders_url: emailAppUrl("/admin/delivery"),
    mark_delivery_url: (options?.markDeliveryUrl ?? "").trim() || emailAppUrl("/admin/delivery")
  };
}

function mapTemplateRow(row: Record<string, unknown>): EmailTemplateRow | null {
  if (!isEmailTemplateEventKey(row.event_key)) return null;
  return {
    id: String(row.id),
    event_key: row.event_key,
    name: String(row.name ?? emailTemplateEventLabelSafe(row.event_key)),
    subject: String(row.subject ?? ""),
    body_html: String(row.body_html ?? ""),
    is_active: row.is_active !== false,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null
  };
}

function emailTemplateEventLabelSafe(eventKey: EmailTemplateEventKey): string {
  const found = DEFAULT_EMAIL_TEMPLATES.find((t) => t.event_key === eventKey);
  return found?.name ?? eventKey;
}

export async function emailTemplatesTableReady(
  db: SupabaseClient
): Promise<boolean> {
  const { error } = await db.from("email_templates").select("id").limit(0);
  return !error;
}

/** Ensure all default events exist (idempotent). Safe if migration not applied. */
export async function ensureDefaultEmailTemplates(
  db: SupabaseClient
): Promise<EmailTemplateRow[]> {
  if (!(await emailTemplatesTableReady(db))) {
    return DEFAULT_EMAIL_TEMPLATES.map((t, index) => ({
      id: `default-${index}`,
      event_key: t.event_key,
      name: t.name,
      subject: t.subject,
      body_html: t.body_html,
      is_active: true,
      updated_at: null
    }));
  }

  for (const def of DEFAULT_EMAIL_TEMPLATES) {
    const { data: existing } = await db
      .from("email_templates")
      .select("id")
      .eq("event_key", def.event_key)
      .maybeSingle();
    if (existing) continue;
    await db.from("email_templates").insert({
      event_key: def.event_key,
      name: def.name,
      subject: def.subject,
      body_html: def.body_html,
      is_active: true
    });
  }

  const { data, error } = await db
    .from("email_templates")
    .select("id, event_key, name, subject, body_html, is_active, updated_at")
    .in("event_key", [...EMAIL_TEMPLATE_EVENTS])
    .order("event_key", { ascending: true });

  if (error || !data) {
    console.error("[email-templates] list failed", error?.message);
    return DEFAULT_EMAIL_TEMPLATES.map((t, index) => ({
      id: `default-${index}`,
      event_key: t.event_key,
      name: t.name,
      subject: t.subject,
      body_html: t.body_html,
      is_active: true,
      updated_at: null
    }));
  }

  const mapped = data
    .map((row) => mapTemplateRow(row as Record<string, unknown>))
    .filter((row): row is EmailTemplateRow => Boolean(row));

  return EMAIL_TEMPLATE_EVENTS.map((key) => {
    const existing = mapped.find((row) => row.event_key === key);
    if (existing) return existing;
    const def = defaultTemplateForEvent(key);
    return {
      id: `missing-${key}`,
      event_key: key,
      name: def.name,
      subject: def.subject,
      body_html: def.body_html,
      is_active: true,
      updated_at: null
    };
  });
}

export async function loadActiveEmailTemplate(
  db: SupabaseClient | null,
  eventKey: EmailTemplateEventKey
): Promise<{ subject: string; body_html: string; source: "db" | "default" }> {
  const fallback = defaultTemplateForEvent(eventKey);
  if (!db || !(await emailTemplatesTableReady(db))) {
    return {
      subject: fallback.subject,
      body_html: fallback.body_html,
      source: "default"
    };
  }

  const { data, error } = await db
    .from("email_templates")
    .select("subject, body_html, is_active")
    .eq("event_key", eventKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.subject || !data?.body_html) {
    return {
      subject: fallback.subject,
      body_html: fallback.body_html,
      source: "default"
    };
  }

  return {
    subject: String(data.subject),
    body_html: String(data.body_html),
    source: "db"
  };
}

/**
 * If the live Settings OFD template predates OTP support, inject a minimal OTP
 * block without replacing the rest of the branded HTML.
 */
function ensureOutForDeliveryOtpPlaceholder(bodyHtml: string): string {
  if (bodyHtml.includes("{{delivery_otp}}")) {
    return bodyHtml;
  }

  const otpBlock = `<table width="100%" style="background:#FAF8F6;border:1px solid #E8E0DA;border-radius:12px;margin:16px 0;"><tr><td style="padding:16px;text-align:center;"><p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B8860B;">Delivery OTP</p><p style="margin:0;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#7B0D2B;">{{delivery_otp}}</p><p style="margin:10px 0 0;font-size:13px;line-height:1.5;color:#5C5C5C;">Share this code with the delivery staff to confirm handover.</p></td></tr></table>`;

  const closingBody = "</td></tr><tr><td style=\"padding:20px;text-align:center;border-top:1px solid #E8E0DA;\"";
  const idx = bodyHtml.indexOf(closingBody);
  if (idx !== -1) {
    return `${bodyHtml.slice(0, idx)}${otpBlock}${bodyHtml.slice(idx)}`;
  }

  return `${bodyHtml}${otpBlock}`;
}

/**
 * If a stored Delivery Assigned template predates the Mark Delivery button,
 * inject the primary CTA without replacing the rest of the branded HTML.
 */
function ensureMarkDeliveryButton(bodyHtml: string): string {
  if (
    bodyHtml.includes("{{mark_delivery_url}}") &&
    /MARK\s*DELIVERY/i.test(bodyHtml)
  ) {
    return bodyHtml;
  }

  const button = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 8px;"><tr><td style="border-radius:10px;background:#7B0D2B;"><a href="{{mark_delivery_url}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.04em;">MARK DELIVERY</a></td></tr></table><p style="margin:12px 0 0;font-size:13px;line-height:1.5;color:#5C5C5C;text-align:center;">You will enter the customer&apos;s 4-digit delivery OTP to confirm.</p>`;

  // Placeholder exists but visible CTA label missing — insert button before open-orders / regards.
  if (bodyHtml.includes("{{mark_delivery_url}}")) {
    // Rare broken template: keep body, append a clear CTA at the end.
    return `${bodyHtml}${button}`;
  }

  const openOrders = bodyHtml.indexOf("{{delivery_orders_url}}");
  if (openOrders !== -1) {
    const pStart = bodyHtml.lastIndexOf("<p", openOrders);
    if (pStart !== -1) {
      return `${bodyHtml.slice(0, pStart)}${button}${bodyHtml.slice(pStart)}`;
    }
  }

  // Hardcoded "Open delivery orders" link (no placeholder) — insert before it.
  const openOrdersText = bodyHtml.search(/Open\s+delivery\s+orders/i);
  if (openOrdersText !== -1) {
    const pStart = bodyHtml.lastIndexOf("<p", openOrdersText);
    if (pStart !== -1) {
      return `${bodyHtml.slice(0, pStart)}${button}${bodyHtml.slice(pStart)}`;
    }
  }

  const regards = bodyHtml.indexOf("Regards");
  if (regards !== -1) {
    const pStart = bodyHtml.lastIndexOf("<p", regards);
    if (pStart !== -1) {
      return `${bodyHtml.slice(0, pStart)}${button}${bodyHtml.slice(pStart)}`;
    }
  }

  return `${bodyHtml}${button}`;
}

/**
 * Delivery Assigned must always include the Mark Delivery CTA.
 * Prefer DB template when it already has the CTA; otherwise inject, then
 * fall back to the branded code default body if still missing.
 */
function resolveDeliveryAssignedBodyHtml(dbBodyHtml: string): {
  bodyHtml: string;
  usedDefaultBody: boolean;
} {
  let bodyHtml = ensureMarkDeliveryButton(dbBodyHtml);
  if (
    bodyHtml.includes("{{mark_delivery_url}}") &&
    /MARK\s*DELIVERY/i.test(bodyHtml)
  ) {
    return { bodyHtml, usedDefaultBody: false };
  }

  const fallback = defaultTemplateForEvent("delivery_assigned").body_html;
  return { bodyHtml: fallback, usedDefaultBody: true };
}

/**
 * Render customer order email from the active Settings template.
 * Falls back to branded code defaults if DB/table/template is unavailable —
 * so existing send triggers keep working.
 */
export async function renderCustomerOrderEmailFromTemplate(
  eventKey: EmailTemplateEventKey,
  order: Order,
  options?: {
    deliveryStaffName?: string | null;
    db?: SupabaseClient | null;
    markDeliveryUrl?: string | null;
  }
): Promise<{ subject: string; html: string; source: "db" | "default" }> {
  const db = options?.db ?? createServiceClient();
  const [template, vars] = await Promise.all([
    loadActiveEmailTemplate(db, eventKey),
    buildOrderEmailTemplateVars(order, {
      deliveryStaffName: options?.deliveryStaffName,
      db,
      markDeliveryUrl: options?.markDeliveryUrl
    })
  ]);

  let bodyHtml =
    eventKey === "out_for_delivery"
      ? ensureOutForDeliveryOtpPlaceholder(template.body_html)
      : template.body_html;

  let source: "db" | "default" = template.source;

  if (eventKey === "delivery_assigned") {
    const resolved = resolveDeliveryAssignedBodyHtml(bodyHtml);
    bodyHtml = resolved.bodyHtml;
    if (resolved.usedDefaultBody) {
      source = "default";
      console.warn(
        "[email-templates] delivery_assigned DB body missing MARK DELIVERY CTA — using code default body"
      );
    }
  }

  return {
    subject: applyEmailTemplateVariables(template.subject, vars),
    html: applyEmailTemplateVariables(bodyHtml, vars),
    source
  };
}
