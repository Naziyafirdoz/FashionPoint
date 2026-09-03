import { getAdminPhoneDigits } from "@/lib/admin/admin-contacts";
import { buildAdminWhatsAppNewOrderMessage } from "@/lib/notifications/admin-new-order-content";
import { getStoreInformation } from "@/lib/settings/store-information";
import { STORE_NAME } from "@/lib/site-config";
import type { Order } from "@/types";

function adminWhatsAppRecipient(): string | undefined {
  const digits = getAdminPhoneDigits();
  if (!digits) return undefined;
  return digits.length === 10 ? `91${digits}` : digits;
}

/** Admin-only WhatsApp alert via Meta Cloud API (WHATSAPP_* env vars). */
export async function sendAdminWhatsAppNewOrder(order: Order): Promise<{ ok: boolean }> {
  const apiUrl = process.env.WHATSAPP_API_URL?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const to = adminWhatsAppRecipient();

  if (!apiUrl || !accessToken || !phoneNumberId || !to) {
    console.warn(
      "[whatsapp-new-order] not configured (WHATSAPP_API_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, ADMIN_PHONE)"
    );
    return { ok: false };
  }

  const { storeName } = await getStoreInformation();
  const message = buildAdminWhatsAppNewOrderMessage(order, storeName.trim() || STORE_NAME);
  const endpoint = `${apiUrl.replace(/\/$/, "")}/${phoneNumberId}/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[whatsapp-new-order] send failed", {
        orderId: order.id,
        orderNumber: order.order_number,
        status: response.status,
        body
      });
      return { ok: false };
    }

    console.info("[whatsapp-new-order] sent", {
      orderId: order.id,
      orderNumber: order.order_number,
      to
    });
    return { ok: true };
  } catch (error) {
    console.error("[whatsapp-new-order] error", {
      orderId: order.id,
      orderNumber: order.order_number,
      error
    });
    return { ok: false };
  }
}
