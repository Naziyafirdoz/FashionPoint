import type { OrderRealtimeEvent } from "@/lib/admin/notifications/types";

const CHANNEL_NAME = "fashionpoint-order-sync";
const TAB_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}`;

type BusPayload = OrderRealtimeEvent & { tabId: string };

type BusListener = (payload: OrderRealtimeEvent) => void;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

/** Broadcast an order change to other browser tabs (same machine). */
export function broadcastOrderSync(payload: OrderRealtimeEvent): void {
  const channel = getChannel();
  if (!channel) return;
  const message: BusPayload = { ...payload, tabId: TAB_ID };
  channel.postMessage(message);
  channel.close();
}

/** Listen for order changes from other tabs. */
export function subscribeOrderSyncBus(listener: BusListener): () => void {
  const channel = getChannel();
  if (!channel) return () => {};

  const onMessage = (event: MessageEvent<BusPayload>) => {
    const data = event.data;
    if (!data?.order || data.tabId === TAB_ID) return;
    listener({ event: data.event, order: data.order, previous: data.previous });
  };

  channel.addEventListener("message", onMessage);
  return () => {
    channel.removeEventListener("message", onMessage);
    channel.close();
  };
}
