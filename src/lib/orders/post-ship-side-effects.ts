/** Isolated post-ship hooks — does not change mark-shipped route behavior. */
export function triggerPostShipSideEffects(orderId: string): void {
  void fetch(`/api/orders/${orderId}/send-rapido-shipped-email`, {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });
}
