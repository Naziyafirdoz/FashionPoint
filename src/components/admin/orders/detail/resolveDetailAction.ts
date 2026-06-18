"use client";

import { getPrimaryAction } from "@/lib/orders/admin-order-ui";
import type { OrderListRow } from "@/lib/orders/admin-orders";
import type { Order } from "@/types";

export function resolveDetailPrimaryAction(order: Order) {
  return getPrimaryAction(order as OrderListRow);
}
