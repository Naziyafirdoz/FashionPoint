import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { executeOrderRemindLater } from "@/lib/server/order-actions/remind";
import { getRequestMeta } from "@/lib/server/order-actions/request-meta";
import { logTokenValidationFailure } from "@/lib/server/order-actions/token-audit";
import {
  consumeActionToken,
  getConfirmedOrderForUsedToken,
  lookupActionToken,
  normalizeReceivedToken,
  validateActionToken
} from "@/lib/server/order-actions/tokens";
import {
  htmlResponse,
  renderAlreadyApprovedPage,
  renderInvalidTokenPage,
  renderRemindErrorPage,
  renderRemindScheduledPage,
  renderTokenExpiredPage,
  renderTokenUsedPage
} from "@/lib/server/notifications/email-action-pages";

export async function GET(req: Request) {
  const rawToken = new URL(req.url).searchParams.get("token");
  const token = rawToken ? normalizeReceivedToken(rawToken) : "";
  const db = createServiceClient();
  if (!db) {
    console.error("[order-actions/remind] service client unavailable");
    return htmlResponse(renderInvalidTokenPage());
  }

  const meta = getRequestMeta(req);

  if (!token) {
    console.warn("[order-actions/remind] missing token query param");
    return htmlResponse(renderInvalidTokenPage());
  }

  const lookup = await lookupActionToken(db, token);
  console.info("[order-actions/remind] token lookup", {
    receivedTokenLength: token.length,
    found: Boolean(lookup),
    tokenId: lookup?.id ?? null,
    orderId: lookup?.order_id ?? null,
    used: lookup?.used ?? null,
    expires_at: lookup?.expires_at ?? null
  });

  const validation = await validateActionToken(db, token, "remind");
  if (!validation.ok) {
    console.warn("[order-actions/remind] token rejected", {
      reason: validation.failure.reason
    });
    await logTokenValidationFailure(db, validation.failure, meta);

    if (validation.failure.reason === "used" && validation.failure.record?.order_id) {
      const confirmed = await getConfirmedOrderForUsedToken(
        db,
        validation.failure.record.order_id
      );
      if (confirmed) {
        return htmlResponse(renderAlreadyApprovedPage(confirmed.orderNumber));
      }
      return htmlResponse(renderTokenUsedPage());
    }

    if (validation.failure.reason === "expired") {
      return htmlResponse(renderTokenExpiredPage());
    }

    return htmlResponse(renderInvalidTokenPage());
  }

  const result = await executeOrderRemindLater(db, validation.record.order_id, {
    performedBy: null,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });

  console.info("[order-actions/remind] executeOrderRemindLater result", {
    ok: result.ok,
    status: result.ok ? result.status : result.status,
    message: result.ok === false ? result.message : undefined,
    remindAt: result.ok && result.status === "scheduled" ? result.remindAt : undefined
  });

  if (result.ok && (result.status === "scheduled" || result.status === "already_approved")) {
    const consumed = await consumeActionToken(db, validation.record.id);
    console.info("[order-actions/remind] token consumed after successful remind", {
      tokenId: validation.record.id,
      consumed,
      status: result.status
    });
  } else if (result.ok === false) {
    console.error("[order-actions/remind] remind failed — token left unused", {
      orderId: validation.record.order_id,
      status: result.status,
      message: result.message
    });
  }

  if (result.ok && result.status === "already_approved") {
    return htmlResponse(renderAlreadyApprovedPage(result.order.order_number));
  }

  if (result.ok && result.status === "scheduled") {
    return htmlResponse(
      renderRemindScheduledPage(result.order.order_number, result.remindAt, result.order.id)
    );
  }

  if (result.ok === false && result.status === "not_awaiting") {
    return htmlResponse(renderAlreadyApprovedPage());
  }

  if (result.ok === false) {
    return htmlResponse(renderRemindErrorPage(validation.record.order_id));
  }

  return htmlResponse(renderInvalidTokenPage());
}

export async function POST() {
  return NextResponse.json({ error: "Use GET with token" }, { status: 405 });
}
