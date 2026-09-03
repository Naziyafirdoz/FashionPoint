import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { executeOrderApproval } from "@/lib/server/order-actions/approve";
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
  renderApproveSuccessPage,
  renderInvalidTokenPage,
  renderTokenExpiredPage,
  renderTokenUsedPage
} from "@/lib/server/notifications/email-action-pages";

export async function GET(req: Request) {
  const rawToken = new URL(req.url).searchParams.get("token");
  const token = rawToken ? normalizeReceivedToken(rawToken) : "";
  const db = createServiceClient();
  if (!db) {
    console.error("[order-actions/approve] service client unavailable");
    return htmlResponse(await renderInvalidTokenPage());
  }

  const meta = getRequestMeta(req);

  if (!token) {
    console.warn("[order-actions/approve] missing token query param");
    return htmlResponse(await renderInvalidTokenPage());
  }

  const lookup = await lookupActionToken(db, token);
  console.info("[order-actions/approve] token lookup", {
    receivedTokenLength: token.length,
    found: Boolean(lookup),
    tokenId: lookup?.id ?? null,
    orderId: lookup?.order_id ?? null,
    used: lookup?.used ?? null,
    used_at: lookup?.used_at ?? null,
    expires_at: lookup?.expires_at ?? null,
    action_type: lookup?.action_type ?? null
  });

  const validation = await validateActionToken(db, token, "approve");
  if (!validation.ok) {
    console.warn("[order-actions/approve] token rejected", {
      receivedTokenLength: token.length,
      reason: validation.failure.reason,
      used_at: lookup?.used_at ?? null,
      expires_at: lookup?.expires_at ?? null
    });
    await logTokenValidationFailure(db, validation.failure, meta);

    if (validation.failure.reason === "used" && validation.failure.record?.order_id) {
      const confirmed = await getConfirmedOrderForUsedToken(
        db,
        validation.failure.record.order_id
      );
      if (confirmed) {
        return htmlResponse(await renderAlreadyApprovedPage(confirmed.orderNumber));
      }
      return htmlResponse(await renderTokenUsedPage());
    }

    if (validation.failure.reason === "expired") {
      return htmlResponse(await renderTokenExpiredPage());
    }

    return htmlResponse(await renderInvalidTokenPage());
  }

  const result = await executeOrderApproval(db, validation.record.order_id, {
    performedBy: null,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });

  console.info("[order-actions/approve] executeOrderApproval result", {
    ok: result.ok,
    status: result.ok ? result.status : result.status,
    message: result.ok === false ? result.message : undefined
  });

  if (result.ok && (result.status === "approved" || result.status === "already_approved")) {
    const consumed = await consumeActionToken(db, validation.record.id);
    console.info("[order-actions/approve] token consumed after successful approval", {
      tokenId: validation.record.id,
      consumed,
      status: result.status
    });
  }

  if (result.ok && result.status === "already_approved") {
    return htmlResponse(await renderAlreadyApprovedPage(result.order.order_number));
  }

  if (result.ok && result.status === "approved") {
    return htmlResponse(
      await renderApproveSuccessPage(result.order.order_number, result.order.id)
    );
  }

  if (result.ok === false && result.status === "not_awaiting") {
    return htmlResponse(await renderAlreadyApprovedPage());
  }

  if (result.ok === false) {
    console.error("[order-actions/approve] approval failed — token left unused", {
      orderId: validation.record.order_id,
      status: result.status,
      message: result.message
    });
  }

  return htmlResponse(await renderInvalidTokenPage());
}

export async function POST() {
  return NextResponse.json({ error: "Use GET with token" }, { status: 405 });
}
