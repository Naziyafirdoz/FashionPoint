import Razorpay from "razorpay";
import crypto from "crypto";

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function getRazorpayPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();
  return key || null;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpay() && getRazorpayPublicKey());
}

export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}

function timingSafeEqualUtf8(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;
  const body = `${params.orderId}|${params.paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return timingSafeEqualUtf8(expected, params.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqualUtf8(expected, signature);
}

export type RazorpayPaymentSnapshot = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};

export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentSnapshot | null> {
  const razorpay = getRazorpay();
  if (!razorpay) return null;

  const payment = (await razorpay.payments.fetch(paymentId)) as {
    id?: string;
    order_id?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
  };

  if (!payment?.id || !payment.order_id) return null;

  return {
    id: String(payment.id),
    order_id: String(payment.order_id),
    amount: Number(payment.amount),
    currency: String(payment.currency ?? "INR"),
    status: String(payment.status ?? "")
  };
}
