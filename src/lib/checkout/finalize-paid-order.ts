import type { SupabaseClient } from "@supabase/supabase-js";
import { deductOrderStock } from "@/lib/inventory/stock";
import { createShipmentForOrder } from "@/lib/delivery/shipment-service";
import { computeEstimatedDeliveryDate, resolveOrderEtaZone } from "@/lib/orders/delivery-dates";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { logWorkflow } from "@/lib/orders/workflow-logger";
import {
  notifyCustomerOrderReceived,
  sendNewOrderAlerts
} from "@/lib/server/notifications/new-order-alerts";
import type { Order } from "@/types";

type FinalizePaidOrderInput = {
  razorpayPaymentId?: string | null;
};

/**
 * After verified Razorpay payment: mark paid + processing (awaiting admin approval),
 * deduct stock, create shipment, and dispatch customer + admin notifications.
 */
export async function finalizePaidOrder(
  db: SupabaseClient,
  order: Order,
  input: FinalizePaidOrderInput = {}
): Promise<Order> {
  logWorkflow("order_finalize_start", {
    orderId: order.id,
    orderNumber: order.order_number,
    fromStatus: order.status,
    fromPaymentStatus: order.payment_status
  });

  const zone = await resolveOrderEtaZone(order, db);
  const etaZone = zone === "outskirts" ? "outstation" : (zone as "local" | "outstation");
  const estimatedDeliveryDate = computeEstimatedDeliveryDate(new Date(), etaZone);
  const now = new Date().toISOString();

  const { data: updated, error: updateError } = await db
    .from("orders")
    .update({
      payment_status: "paid",
      status: "processing",
      razorpay_payment_id: input.razorpayPaymentId ?? null,
      estimated_delivery_date: estimatedDeliveryDate,
      updated_at: now
    })
    .eq("id", order.id)
    .eq("payment_status", "pending")
    .select("*")
    .maybeSingle();

  if (updateError) {
    logWorkflow(
      "order_finalize_failed",
      { orderId: order.id, orderNumber: order.order_number, error: updateError.message },
      "error"
    );
    throw new Error(updateError.message);
  }

  if (!updated) {
    const { data: existing } = await db
      .from("orders")
      .select("*")
      .eq("id", order.id)
      .maybeSingle();

    if (existing?.payment_status === "paid") {
      logWorkflow("payment_verify_idempotent", {
        orderId: order.id,
        orderNumber: order.order_number,
        status: existing.status
      });
      return existing as Order;
    }

    logWorkflow(
      "order_finalize_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        error: "Concurrent payment finalize — no pending row updated"
      },
      "error"
    );
    throw new Error("Could not finalize order — payment may have already been processed");
  }

  logWorkflow("order_status_transition", {
    orderId: updated.id,
    orderNumber: updated.order_number,
    fromStatus: order.status,
    toStatus: "processing",
    fromPaymentStatus: order.payment_status,
    toPaymentStatus: "paid"
  });

  logWorkflow("order_finalize_status_updated", {
    orderId: updated.id,
    orderNumber: updated.order_number,
    status: updated.status,
    paymentStatus: updated.payment_status
  });

  const deduct = await deductOrderStock(db, updated.items as Order["items"]);
  if (deduct.error) {
    await db
      .from("orders")
      .update({
        payment_status: "failed",
        status: "pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    logWorkflow(
      "order_finalize_failed",
      {
        orderId: order.id,
        orderNumber: order.order_number,
        error: deduct.error,
        reason: "stock_deduction_failed"
      },
      "error"
    );
    throw new Error(deduct.error);
  }

  logWorkflow("order_finalize_stock_deducted", {
    orderId: updated.id,
    orderNumber: updated.order_number
  });

  const normalized = await normalizeOrderRecord(db, updated as Order, { persist: false });

  try {
    await createShipmentForOrder(db, normalized);
    logWorkflow("order_finalize_shipment_created", {
      orderId: normalized.id,
      orderNumber: normalized.order_number
    });
  } catch (error) {
    logWorkflow(
      "order_finalize_failed",
      {
        orderId: normalized.id,
        orderNumber: normalized.order_number,
        error: error instanceof Error ? error.message : String(error),
        reason: "shipment_creation_failed"
      },
      "warn"
    );
  }

  try {
    await sendNewOrderAlerts(db, normalized);
  } catch (error) {
    logWorkflow(
      "admin_email_failed",
      {
        orderId: normalized.id,
        orderNumber: normalized.order_number,
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
  }

  try {
    await notifyCustomerOrderReceived(normalized);
  } catch (error) {
    logWorkflow(
      "customer_email_failed",
      {
        orderId: normalized.id,
        orderNumber: normalized.order_number,
        error: error instanceof Error ? error.message : String(error)
      },
      "error"
    );
  }

  logWorkflow("order_finalize_status_updated", {
    orderId: normalized.id,
    orderNumber: normalized.order_number,
    phase: "complete",
    status: normalized.status,
    paymentStatus: normalized.payment_status
  });

  return normalized;
}
