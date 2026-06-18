import { sendAdminSMSNewOrder } from "@/lib/notifications/sms";
import { sendAdminWhatsAppNewOrder } from "@/lib/notifications/whatsapp";
import type { Order } from "@/types";

/** Fire admin WhatsApp + SMS new-order alerts; never throws. */
export async function notifyAdminNewOrder(order: Order): Promise<void> {
  try {
    await sendAdminWhatsAppNewOrder(order);
  } catch (error) {
    console.error("[notifyAdminNewOrder] WhatsApp failed", {
      orderId: order.id,
      orderNumber: order.order_number,
      error
    });
  }

  try {
    await sendAdminSMSNewOrder(order);
  } catch (error) {
    console.error("[notifyAdminNewOrder] SMS failed", {
      orderId: order.id,
      orderNumber: order.order_number,
      error
    });
  }
}

export { sendAdminSMSNewOrder } from "@/lib/notifications/sms";
export { sendAdminWhatsAppNewOrder } from "@/lib/notifications/whatsapp";
