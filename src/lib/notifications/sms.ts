import { getAdminPhoneDigits } from "@/lib/admin/admin-contacts";
import { buildAdminSMSNewOrderMessage } from "@/lib/notifications/admin-new-order-content";
import { getStoreInformation } from "@/lib/settings/store-information";
import { STORE_NAME } from "@/lib/site-config";
import type { Order } from "@/types";

/** Admin-only SMS alert (SMS_API_URL + SMS_API_KEY + SMS_SENDER_ID + ADMIN_PHONE). */
export async function sendAdminSMSNewOrder(order: Order): Promise<{ ok: boolean }> {
  const apiUrl = process.env.SMS_API_URL?.trim();
  const apiKey = process.env.SMS_API_KEY?.trim();
  const senderId = process.env.SMS_SENDER_ID?.trim();
  const to = getAdminPhoneDigits();

  if (!apiUrl || !apiKey || !senderId || !to) {
    console.warn(
      "[sms-new-order] not configured (SMS_API_URL, SMS_API_KEY, SMS_SENDER_ID, ADMIN_PHONE)"
    );
    return { ok: false };
  }

  const { storeName } = await getStoreInformation();
  const message = buildAdminSMSNewOrderMessage(order, storeName.trim() || STORE_NAME);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey
      },
      body: JSON.stringify({
        sender_id: senderId,
        to,
        message
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[sms-new-order] send failed", {
        orderId: order.id,
        orderNumber: order.order_number,
        status: response.status,
        body
      });
      return { ok: false };
    }

    console.info("[sms-new-order] sent", {
      orderId: order.id,
      orderNumber: order.order_number,
      to
    });
    return { ok: true };
  } catch (error) {
    console.error("[sms-new-order] error", {
      orderId: order.id,
      orderNumber: order.order_number,
      error
    });
    return { ok: false };
  }
}
