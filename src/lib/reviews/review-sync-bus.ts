const CHANNEL_NAME = "fashionpoint-review-sync";
const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}`;

export type ReviewSyncEvent = {
  productId?: string | null;
};

type BusPayload = ReviewSyncEvent & { tabId: string };

type BusListener = (payload: ReviewSyncEvent) => void;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

/** Broadcast a review change to other browser tabs (same machine). */
export function broadcastReviewSync(payload: ReviewSyncEvent = {}): void {
  const channel = getChannel();
  if (!channel) return;
  const message: BusPayload = { ...payload, tabId: TAB_ID };
  channel.postMessage(message);
  channel.close();
}

/** Listen for review changes from other tabs. */
export function subscribeReviewSyncBus(listener: BusListener): () => void {
  const channel = getChannel();
  if (!channel) return () => {};

  const onMessage = (event: MessageEvent<BusPayload>) => {
    const data = event.data;
    if (!data || data.tabId === TAB_ID) return;
    listener({ productId: data.productId ?? null });
  };

  channel.addEventListener("message", onMessage);
  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}
