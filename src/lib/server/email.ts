import { Resend } from "resend";
import { getAdminEmail } from "@/lib/admin/admin-contacts";
import {
  buildCustomerOrderConfirmedEmail,
  buildCustomerOrderConfirmedEmailSimple,
  buildCustomerOrderReceivedEmail
} from "@/lib/server/notifications/email-templates";
import { RESEND_FROM_ALERTS_STORE, RESEND_FROM_ORDERS } from "@/lib/server/resend-from-addresses";
import type { Order } from "@/types";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendOrderReceived(params: { to: string; order: Order }) {
  if (!resend) return;

  const { subject, html } = buildCustomerOrderReceivedEmail(params.order);
  await resend.emails.send({
    from: RESEND_FROM_ORDERS,
    to: params.to,
    subject,
    html
  });
}

export async function sendOrderConfirmation(params: {
  to: string;
  orderNumber: string;
  total: number;
  order?: Order;
}) {
  if (!resend) return;

  if (params.order) {
    const { subject, html } = buildCustomerOrderConfirmedEmail(params.order);
    await resend.emails.send({
      from: RESEND_FROM_ORDERS,
      to: params.to,
      subject,
      html
    });
    return;
  }

  const { subject, html } = buildCustomerOrderConfirmedEmailSimple({
    orderNumber: params.orderNumber,
    total: params.total
  });

  await resend.emails.send({
    from: RESEND_FROM_ORDERS,
    to: params.to,
    subject,
    html
  });
}

export async function sendLowStockAlert(productName: string) {
  const admin = getAdminEmail();
  if (!resend || !admin) return;
  await resend.emails.send({
    from: RESEND_FROM_ALERTS_STORE,
    to: admin,
    subject: `Low Stock Alert — ${productName}`,
    html: `<p>Product <strong>${productName}</strong> is out of stock.</p>`
  });
}
