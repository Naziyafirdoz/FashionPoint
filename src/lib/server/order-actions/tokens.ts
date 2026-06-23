import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emailAppUrl } from "@/lib/server/notifications/email-app-url";

export type ActionTokenType = "approve" | "remind";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function generateTokenValue(): string {
  return randomBytes(32).toString("hex");
}

/** Normalize token from query string — raw hex, no hashing on either side. */
export function normalizeReceivedToken(raw: string): string {
  let token = raw.trim();
  if (!token) return token;

  try {
    if (token.includes("%")) {
      token = decodeURIComponent(token);
    }
  } catch {
    // keep trimmed raw value
  }

  return token.trim();
}

export function buildTokenActionUrl(action: ActionTokenType, token: string): string {
  return emailAppUrl(`/api/order-actions/${action}?token=${encodeURIComponent(token)}`);
}

export type OrderEmailActionUrls = {
  approveUrl: string;
  remindUrl: string;
};

export async function createActionToken(
  db: SupabaseClient,
  orderId: string,
  actionType: ActionTokenType,
  createdBy?: string | null
): Promise<string | null> {
  const token = generateTokenValue();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { data, error } = await db
    .from("action_tokens")
    .insert({
      order_id: orderId,
      token,
      action_type: actionType,
      expires_at: expiresAt,
      used: false
    })
    .select("id")
    .single();

  const insertSucceeded = Boolean(data?.id) && !error;

  console.info("[action-tokens] create", {
    orderId,
    actionType,
    tokenLength: token.length,
    insertSucceeded,
    tokenId: data?.id ?? null,
    error: error?.message ?? null
  });

  if (error || !data?.id) {
    console.error("[action-tokens] create failed", {
      orderId,
      actionType,
      message: error?.message,
      code: error?.code,
      details: error?.details
    });
    return null;
  }

  return token;
}

/** Create fresh approve + remind tokens for email action buttons. */
export async function createOrderEmailActionUrls(
  db: SupabaseClient,
  orderId: string,
  createdBy?: string | null
): Promise<OrderEmailActionUrls | null> {
  const approveToken = await createActionToken(db, orderId, "approve", createdBy);
  const remindToken = await createActionToken(db, orderId, "remind", createdBy);

  if (!approveToken || !remindToken) return null;

  return {
    approveUrl: buildTokenActionUrl("approve", approveToken),
    remindUrl: buildTokenActionUrl("remind", remindToken)
  };
}

export type ValidatedActionToken = {
  id: string;
  order_id: string;
  action_type: ActionTokenType;
};

export type TokenValidationFailure = {
  reason: "invalid" | "expired" | "used" | "wrong_action";
  record?: Pick<ValidatedActionToken, "id" | "order_id">;
};

export type ActionTokenRecord = {
  id: string;
  order_id: string;
  action_type: string;
  expires_at: string;
  used: boolean;
  used_at: string | null;
};

export async function lookupActionToken(
  db: SupabaseClient,
  token: string
): Promise<ActionTokenRecord | null> {
  const trimmed = normalizeReceivedToken(token);
  if (!trimmed) return null;

  const { data, error } = await db
    .from("action_tokens")
    .select("id, order_id, action_type, expires_at, used, used_at")
    .eq("token", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[action-tokens] lookup failed", {
      tokenLength: trimmed.length,
      message: error.message,
      code: error.code,
      details: error.details
    });
    return null;
  }

  return (data as ActionTokenRecord | null) ?? null;
}

export async function validateActionToken(
  db: SupabaseClient,
  token: string,
  expectedAction: ActionTokenType
): Promise<
  | { ok: true; record: ValidatedActionToken }
  | { ok: false; failure: TokenValidationFailure }
> {
  const normalized = normalizeReceivedToken(token);
  const data = await lookupActionToken(db, normalized);
  const record = data ? { id: data.id, order_id: data.order_id } : undefined;

  if (!data) {
    return { ok: false, failure: { reason: "invalid" } };
  }
  if (data.used) {
    return { ok: false, failure: { reason: "used", record } };
  }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, failure: { reason: "expired", record } };
  }
  if (data.action_type !== expectedAction) {
    return { ok: false, failure: { reason: "wrong_action", record } };
  }

  return {
    ok: true,
    record: {
      id: data.id,
      order_id: data.order_id,
      action_type: data.action_type as ActionTokenType
    }
  };
}

export async function consumeActionToken(
  db: SupabaseClient,
  tokenId: string,
  usedBy?: string | null
): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("action_tokens")
    .update({ used: true, used_at: now, used_by: usedBy ?? null })
    .eq("id", tokenId)
    .eq("used", false)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[action-tokens] consume failed", {
      tokenId,
      message: error.message,
      code: error.code
    });
    return false;
  }

  return Boolean(data);
}

/** If a used approve token belongs to a confirmed order, show already-approved UX. */
export async function getConfirmedOrderForUsedToken(
  db: SupabaseClient,
  orderId: string
): Promise<{ orderNumber: string } | null> {
  const { data } = await db
    .from("orders")
    .select("status, order_number")
    .eq("id", orderId)
    .maybeSingle();

  if (data?.status === "confirmed" && data.order_number) {
    return { orderNumber: data.order_number as string };
  }

  return null;
}
