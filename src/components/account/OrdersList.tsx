import Link from "next/link";
import { OrdersListClient } from "@/components/account/OrdersListClient";
import { STORE_NAME } from "@/lib/site-config";
import type { Order } from "@/types";

type OrdersListProps = {
  orders: Order[];
  userId: string;
  storeName?: string;
};

export function OrdersList({ orders, userId, storeName = STORE_NAME }: OrdersListProps) {
  return <OrdersListClient orders={orders} userId={userId} storeName={storeName} />;
}

export function OrdersPageShell({
  title,
  orders,
  userId,
  backHref = "/account/dashboard",
  storeName = STORE_NAME
}: {
  title: string;
  orders: Order[];
  userId: string;
  backHref?: string;
  storeName?: string;
}) {
  return (
    <div className="mx-auto max-w-[780px] px-4 py-12">
      <Link href={backHref} className="text-sm text-primary hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-primary">{title}</h1>
      <OrdersList orders={orders} userId={userId} storeName={storeName} />
    </div>
  );
}
