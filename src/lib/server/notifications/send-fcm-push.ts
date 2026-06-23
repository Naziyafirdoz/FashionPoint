import { customerName } from "@/lib/orders/admin-orders";
import type { Order } from "@/types";

export type FcmPushEvent = "new_order" | "packed" | "ready_for_shipping" | "shipped";

const FCM_EVENT_ALIASES: Record<string, FcmPushEvent> = {
  new_order: "new_order",
  packed: "packed",
  worker_packed: "packed",
  ready_for_shipping: "ready_for_shipping",
  ready_for_dispatch: "ready_for_shipping",
  shipped: "shipped"
};

export function resolveFcmPushEvent(eventKey: string): FcmPushEvent | null {
  return FCM_EVENT_ALIASES[eventKey] ?? null;
}

export function buildFcmPushMessage(
  order: Order,
  event: FcmPushEvent
): { title: string; body: string } {
  switch (event) {
    case "new_order":
      return {
        title: "🛒 New Order Received",
        body: `Order ${order.order_number} from ${customerName(order)}`
      };
    case "packed":
      return {
        title: "📦 Order Packed",
        body: `${order.order_number} has been packed`
      };
    case "ready_for_shipping":
      return {
        title: "🚚 Ready For Shipping",
        body: `${order.order_number} is ready for dispatch`
      };
    case "shipped":
      return {
        title: "🚛 Order Shipped",
        body: `${order.order_number} has been shipped`
      };
  }
}

function pushApiBaseUrl(): string {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000"
  );
}

export async function sendFcmPushNotification(title: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(`${pushApiBaseUrl()}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title, body })
    });

    if (!res.ok) {
      throw new Error(`Push send failed with status ${res.status}`);
    }

    return true;
  } catch (error) {
    console.error("[push] failed", error);
    return false;
  }
}

export async function sendOrderFcmPush(order: Order, event: FcmPushEvent): Promise<boolean> {
  const { title, body } = buildFcmPushMessage(order, event);
  return sendFcmPushNotification(title, body);
}
