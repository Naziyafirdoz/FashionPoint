"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import toast from "react-hot-toast";
import { AlertCircle, XCircle } from "lucide-react";
import { STORE_NAME } from "@/lib/site-config";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
    };
  }
}

type PaymentResultPageProps = {
  variant: "failed" | "cancelled";
  orderNumber?: string;
  reason?: string;
};

function successUrl(orderNumber: string) {
  return `/order-success/${encodeURIComponent(orderNumber)}`;
}

export function PaymentResultPage({ variant, orderNumber, reason }: PaymentResultPageProps) {
  const [retrying, setRetrying] = useState(false);
  const isFailed = variant === "failed";

  const completePayment = useCallback(
    async (verifyBody: Record<string, unknown>) => {
      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyBody)
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast.error(verifyData.error ?? "Payment verification failed");
        return false;
      }
      window.location.href = successUrl(verifyData.orderNumber ?? orderNumber ?? "");
      return true;
    },
    [orderNumber]
  );

  const openRazorpay = useCallback(
    (data: {
      razorpayOrderId: string;
      key: string;
      amount: number;
      orderId: string;
      demo?: boolean;
    }) => {
      if (data.demo) {
        void completePayment({ demo: true, orderId: data.orderId });
        return;
      }

      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: "INR",
        name: STORE_NAME,
        order_id: data.razorpayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await completePayment(response);
        },
        modal: {
          ondismiss: () => {
            window.location.href = `/checkout/payment-cancelled?order=${encodeURIComponent(orderNumber ?? "")}`;
          }
        }
      });

      rzp.on("payment.failed", (response) => {
        const error = response.error as { description?: string } | undefined;
        const description = error?.description ?? "Payment could not be completed";
        void fetch("/api/payment/mark-failed", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, reason: description })
        });
        window.location.href = `/checkout/payment-failed?order=${encodeURIComponent(orderNumber ?? "")}&reason=${encodeURIComponent(description)}`;
      });

      rzp.open();
    },
    [completePayment, orderNumber]
  );

  const handleRetry = async () => {
    if (!orderNumber) {
      window.location.href = "/checkout";
      return;
    }

    setRetrying(true);
    try {
      const res = await fetch("/api/payment/retry", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber })
      });
      const data = await res.json();

      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent("/checkout")}`;
        return;
      }

      if (!res.ok) {
        toast.error(data.error ?? "Could not restart payment");
        return;
      }

      if (data.demo) {
        await completePayment({ demo: true, orderId: data.orderId });
        return;
      }

      if (!data.razorpayOrderId || !data.key) {
        toast.error("Payment not configured");
        return;
      }

      openRazorpay({
        razorpayOrderId: data.razorpayOrderId,
        key: data.key,
        amount: data.amount,
        orderId: data.orderId
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-display text-2xl font-bold text-primary">{STORE_NAME}</p>

        {isFailed ? (
          <AlertCircle className="mx-auto mt-8 h-16 w-16 text-red-600" strokeWidth={1.5} />
        ) : (
          <XCircle className="mx-auto mt-8 h-16 w-16 text-amber-600" strokeWidth={1.5} />
        )}

        <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
          {isFailed ? "Payment Failed" : "Payment Cancelled"}
        </h1>

        {orderNumber ? (
          <p className="mt-2 text-sm text-foreground/60">Order {orderNumber}</p>
        ) : null}

        {isFailed && reason ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {reason}
          </p>
        ) : (
          <p className="mt-4 text-sm text-foreground/70">
            {isFailed
              ? "Your payment could not be processed. You can retry or return to checkout."
              : "You closed the payment window. Your order is saved — retry when you are ready."}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="btn-primary"
          >
            {retrying ? "Starting payment…" : "Retry Payment"}
          </button>
          <Link href="/checkout" className="btn-outline">
            Back to Checkout
          </Link>
        </div>
      </div>
    </>
  );
}
