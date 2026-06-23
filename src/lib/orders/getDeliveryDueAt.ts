import { ORDER_TIMINGS } from "@/lib/config/order-timings";

export function getDeliveryDueAt(createdAt: string): Date {
  const created = new Date(createdAt);

  if (ORDER_TIMINGS.ENABLE_TEST_MODE) {
    created.setMinutes(created.getMinutes() + ORDER_TIMINGS.TEST_DELIVERY_DUE_MINUTES);
  } else {
    created.setDate(created.getDate() + ORDER_TIMINGS.DELIVERY_DUE_DAYS);
  }

  return created;
}
