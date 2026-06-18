"use client";



import { useEffect } from "react";

import Link from "next/link";

import { CheckCircle, Download, Truck } from "lucide-react";

import toast from "react-hot-toast";

import { paymentMethodLabel } from "@/lib/checkout/payment-methods";
import {
  CUSTOMER_CANCELLED_ONLINE_PAYMENT_MESSAGE,
  shouldShowCancelledRefundDetails
} from "@/lib/orders/cancellation";
import { normalizeOrderItems } from "@/lib/orders/order-items";

import { STORE_NAME } from "@/lib/site-config";

import { useCheckoutSession } from "@/stores/checkout-session";

import { FinalSalePolicyNotice } from "@/components/store/FinalSalePolicyNotice";

import type { Order } from "@/types";



type OrderSuccessViewProps = {

  order: Order | null;

  hasOrderRef: boolean;

  orderNumber?: string;

};



function formatAddress(address: Record<string, string> | undefined) {

  if (!address) return null;

  const lines = [

    address.name,

    address.line ?? [address.line1, address.line2].filter(Boolean).join(", "),

    [address.city, address.state, address.pincode].filter(Boolean).join(", "),

    address.phone,

    address.email

  ].filter((line) => line && String(line).trim());



  return lines.length > 0 ? lines : null;

}



export function OrderSuccessView({ order, hasOrderRef, orderNumber }: OrderSuccessViewProps) {

  const endCheckoutSession = useCheckoutSession((s) => s.endSession);

  useEffect(() => {
    endCheckoutSession();
  }, [endCheckoutSession]);



  const handleInvoice = () => {

    toast("Invoice generation coming soon", { icon: "📄" });

  };



  if (!hasOrderRef || !order) {

    return (

      <div className="mx-auto max-w-lg px-4 py-16 text-center">

        <p className="font-display text-2xl font-bold" style={{ color: "#7B0D2B" }}>

          {STORE_NAME}

        </p>

        <CheckCircle className="mx-auto mt-8 h-16 w-16 text-green-600" strokeWidth={1.5} />

        <h1 className="mt-6 font-display text-2xl font-bold text-foreground">

          Thank you for your order!

        </h1>

        {orderNumber ? (

          <p className="mt-3 text-sm text-foreground/60">

            We could not load details for order {orderNumber}. Check{" "}

            <Link href="/account/orders" className="text-primary underline">

              My Orders

            </Link>

            .

          </p>

        ) : (

          <p className="mt-3 text-sm text-foreground/70">

            Your order has been received. You can view order details in your account.

          </p>

        )}

        <FinalSalePolicyNotice variant="success" className="mt-6 text-left" />

        <Link href="/account/orders" className="btn-primary mt-8 inline-block">

          Go To My Orders

        </Link>

      </div>

    );

  }



  const items = normalizeOrderItems(order.items);

  const addressLines = formatAddress(order.shipping_address);

  const shippingCity = order.shipping_address?.city?.trim().toLowerCase() ?? "";
  const showVijayawadaDeliveryEstimate = shippingCity === "vijayawada";

  const isCod = order.payment_method === "cod";
  const isCancelled = order.status === "cancelled";
  const showCancelledRefundMessage = shouldShowCancelledRefundDetails(order);



  return (

    <div className="mx-auto max-w-2xl px-4 py-12">

      <p className="text-center font-display text-2xl font-bold" style={{ color: "#7B0D2B" }}>

        {STORE_NAME}

      </p>



      <div className="mt-8 text-center">

        <CheckCircle className="mx-auto h-16 w-16 text-green-600" strokeWidth={1.5} />

        <h1 className="mt-6 font-display text-2xl font-bold text-foreground md:text-3xl">

          {isCancelled ? "Order Cancelled" : "Order Placed Successfully!"}

        </h1>

        <p className="mt-3 text-lg font-semibold" style={{ color: "#B8860B" }}>

          {order.order_number}

        </p>

      </div>



      <div className="card-store mt-10 space-y-6">

        <div>

          <h2 className="text-sm font-semibold text-foreground/70">Items</h2>

          <ul className="mt-3 divide-y">

            {items.map((item, index) => (

              <li

                key={`${item.productId}-${item.size}-${index}`}

                className="flex items-start justify-between gap-4 py-3 text-sm"

              >

                <div>

                  <p className="font-medium text-foreground">{item.name}</p>

                  <p className="mt-1 text-foreground/60">

                    Size: {item.size} · Color: {item.color} · Qty: {item.quantity}

                  </p>

                </div>

                <p className="shrink-0 font-medium">

                  ₹{item.subtotal.toLocaleString("en-IN")}

                </p>

              </li>

            ))}

          </ul>

        </div>



        {addressLines ? (

          <div>

            <h2 className="text-sm font-semibold text-foreground/70">Shipping Address</h2>

            <address className="mt-2 not-italic text-sm leading-relaxed text-foreground/80">

              {addressLines.map((line) => (

                <span key={line} className="block">

                  {line}

                </span>

              ))}

            </address>

          </div>

        ) : null}

        {showVijayawadaDeliveryEstimate && !isCancelled ? (
          <p className="flex items-start gap-2 text-xs text-foreground/70 sm:text-sm">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Estimated Delivery:</span> Approximately 2 Days
            </span>
          </p>
        ) : null}

        {isCancelled ? (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-foreground/80">
            <p className="font-medium text-red-800">This order has been cancelled.</p>
            {showCancelledRefundMessage ? (
              <p className="mt-2">{CUSTOMER_CANCELLED_ONLINE_PAYMENT_MESSAGE}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">

          <span

            className={`rounded-full px-3 py-1 text-xs font-semibold ${

              isCod ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800"

            }`}

          >

            {paymentMethodLabel(order.payment_method)}

          </span>

        </div>



        <dl className="space-y-2 border-t pt-4 text-sm">

          <div className="flex justify-between">

            <dt className="text-foreground/60">Subtotal</dt>

            <dd>₹{Number(order.subtotal).toLocaleString("en-IN")}</dd>

          </div>

          <div className="flex justify-between">

            <dt className="text-foreground/60">Shipping</dt>

            <dd>

              {Number(order.shipping_amount) === 0

                ? "Free"

                : `₹${Number(order.shipping_amount).toLocaleString("en-IN")}`}

            </dd>

          </div>

          {Number(order.discount_amount) > 0 ? (

            <div className="flex justify-between text-green-700">

              <dt>Discount</dt>

              <dd>-₹{Number(order.discount_amount).toLocaleString("en-IN")}</dd>

            </div>

          ) : null}

          <div className="flex justify-between font-semibold">

            <dt>Total</dt>

            <dd className="text-xl font-bold text-primary">

              ₹{Number(order.total).toLocaleString("en-IN")}

            </dd>

          </div>

        </dl>

      </div>



      <FinalSalePolicyNotice variant="success" className="mt-6" />



      <p className="mt-6 rounded-xl border border-blush bg-blush/30 px-4 py-3 text-sm text-foreground/70">

        After your order is delivered, you can leave a review from{" "}

        <Link href="/account/orders" className="font-medium text-primary underline">

          My Orders

        </Link>

        .

      </p>



      <div className="mt-6 flex flex-col gap-3 sm:flex-row">

        <Link href="/account/orders" className="btn-primary flex-1 text-center">

          Go To My Orders

        </Link>

        <button

          type="button"

          onClick={handleInvoice}

          className="btn-outline flex flex-1 items-center justify-center gap-2"

        >

          <Download className="h-4 w-4" />

          Download Invoice

        </button>

        <Link href="/" className="btn-outline flex-1 text-center">

          Continue Shopping

        </Link>

      </div>

    </div>

  );

}

