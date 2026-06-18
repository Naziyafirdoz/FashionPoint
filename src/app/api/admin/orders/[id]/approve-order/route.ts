import { NextResponse } from "next/server";
import { requireAdminStaff } from "@/lib/admin/require-staff";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { isAwaitingOrderApproval } from "@/lib/orders/fulfillment-workflow";
import { cancelAdminApprovalReminders } from "@/lib/server/notifications/admin-approval-reminders";
import { sendOrderConfirmation } from "@/lib/server/email";
import { htmlResponse, renderApproveSuccessPage } from "@/lib/server/notifications/email-action-pages";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

async function approveOrder(id: string, viaEmail: boolean) {
  const auth = await requireAdminStaff();
  if (!auth.ok) return { response: auth.response as NextResponse };

  const { data: existing, error: fetchError } = await auth.ctx.db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    const res = NextResponse.json({ error: "Unable to load order" }, { status: 500 });
    return { response: res };
  }
  if (!existing) {
    const res = NextResponse.json({ error: "Order not found" }, { status: 404 });
    return { response: res };
  }

  const order = existing as Order;
  const status = order.status as string;

  if (status === "confirmed") {
    const normalized = await normalizeOrderRecord(auth.ctx.db, order, { persist: false });
    if (viaEmail) {
      return { response: htmlResponse(renderApproveSuccessPage(order.order_number, id)) };
    }
    return {
      response: NextResponse.json({
        success: true,
        order: normalized,
        message: "Order already confirmed"
      })
    };
  }

  if (!isAwaitingOrderApproval(status)) {
    if (viaEmail) {
      return {
        response: htmlResponse(
          `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;"><p>Order cannot be approved in its current status.</p></body></html>`
        )
      };
    }
    return {
      response: NextResponse.json({ error: "Only pending orders can be approved" }, { status: 400 })
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await auth.ctx.db
    .from("orders")
    .update({ status: "confirmed", confirmed_at: now, updated_at: now })
    .eq("id", id)
    .in("status", ["pending", "processing"])
    .select("*")
    .maybeSingle();

  if (error) {
    if (viaEmail) {
      return {
        response: htmlResponse(
          `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;"><p>Unable to approve order.</p></body></html>`
        )
      };
    }
    return { response: NextResponse.json({ error: "Unable to approve order" }, { status: 500 }) };
  }

  if (!updated) {
    const { data: current } = await auth.ctx.db.from("orders").select("*").eq("id", id).maybeSingle();
    if (current && (current.status as string) === "confirmed") {
      if (viaEmail) {
        return {
          response: htmlResponse(renderApproveSuccessPage((current as Order).order_number, id))
        };
      }
      const normalized = await normalizeOrderRecord(auth.ctx.db, current as Order, {
        persist: false
      });
      return {
        response: NextResponse.json({
          success: true,
          order: normalized,
          message: "Order already confirmed"
        })
      };
    }
    if (viaEmail) {
      return {
        response: htmlResponse(
          `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;"><p>Order could not be approved.</p></body></html>`
        )
      };
    }
    return { response: NextResponse.json({ error: "Order could not be approved" }, { status: 409 }) };
  }

  await cancelAdminApprovalReminders(auth.ctx.db, id);

  const normalized = await normalizeOrderRecord(auth.ctx.db, updated as Order, { persist: false });
  const customerEmail = normalized.shipping_address?.email ?? normalized.guest_email;

  if (customerEmail) {
    console.info("[approve-order] sending customer confirmation", {
      orderId: normalized.id,
      orderNumber: normalized.order_number,
      to: customerEmail
    });
    await sendOrderConfirmation({
      to: customerEmail,
      orderNumber: normalized.order_number,
      total: Number(normalized.total),
      order: normalized
    });
    console.info("[approve-order] customer confirmation sent", {
      orderId: normalized.id,
      orderNumber: normalized.order_number
    });
  }

  if (viaEmail) {
    return { response: htmlResponse(renderApproveSuccessPage(normalized.order_number, id)) };
  }

  return {
    response: NextResponse.json({
      success: true,
      order: normalized,
      message: "Order confirmed"
    })
  };
}

export async function POST(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const result = await approveOrder(id, false);
  return result.response;
}

/** Email link handler: approves order when still pending. */
export async function GET(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const url = new URL(req.url);
  if (url.searchParams.get("via") !== "email") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await approveOrder(id, true);
  return result.response;
}
