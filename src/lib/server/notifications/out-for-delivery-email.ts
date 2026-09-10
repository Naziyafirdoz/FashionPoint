import type { Order } from "@/types";
import { sendTemplatedCustomerOrderEmail } from "@/lib/server/notifications/send-templated-customer-email";
import { renderCustomerOrderEmailFromTemplate } from "@/lib/server/notifications/email-template-system";

export const CUSTOMER_OUT_FOR_DELIVERY_EVENT = "customer_out_for_delivery";

/** @deprecated Prefer sendTemplatedCustomerOrderEmail — kept for callers/tests. */
export async function buildCustomerOutForDeliveryEmail(
  order: Order
): Promise<{ subject: string; html: string }> {
  return renderCustomerOrderEmailFromTemplate("out_for_delivery", order);
}

export async function notifyCustomerOutForDelivery(order: Order): Promise<void> {
  await sendTemplatedCustomerOrderEmail({
    eventKey: "out_for_delivery",
    order
  });
}
