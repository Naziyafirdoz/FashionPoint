import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { fetchCustomerOrdersForUser, CUSTOMER_ORDER_LIST_SELECT } from "@/lib/orders/customer-order-retrieval";
import { redirect } from "next/navigation";
import { OrdersPageShell } from "@/components/account/OrdersList";
import { fetchStoreInformationShipmentSource } from "@/lib/settings/store-information";
import type { Order } from "@/types";

export const metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account/orders");

  const db = createServiceClient();
  let orders: Order[] = [];

  if (db) {
    const result = await fetchCustomerOrdersForUser(db, user.id, user.email, { limit: 20 });
    orders = result.orders;
    if (result.error) {
      console.error("[customer-orders] ssr fetch failed", {
        userId: user.id,
        email: user.email ?? null,
        error: result.error
      });
    }
  } else {
    const { data, error } = await supabase
      .from("orders")
      .select(CUSTOMER_ORDER_LIST_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    orders = (data ?? []) as Order[];
    if (error) {
      console.error("[customer-orders] ssr rls fetch failed", {
        userId: user.id,
        message: error.message
      });
    }
    console.info("[customer-orders] ssr rls fallback", {
      userId: user.id,
      count: orders.length
    });
  }

  console.info("[customer-orders] ssr rendered", {
    userId: user.id,
    email: user.email ?? null,
    count: orders.length
  });

  // Same source as /api/orders?scope=customer — raw store_settings, no site-config defaults.
  const store = await fetchStoreInformationShipmentSource();

  return (
    <OrdersPageShell
      title="My Orders"
      orders={orders}
      userId={user.id}
      storeName={store.storeName}
      storeAddress={store.address}
    />
  );
}
