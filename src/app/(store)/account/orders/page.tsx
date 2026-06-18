import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrdersPageShell } from "@/components/account/OrdersList";
import type { Order } from "@/types";

export const metadata = { title: "My Orders" };

export default async function AccountOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account/orders");

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <OrdersPageShell title="My Orders" orders={(orders ?? []) as Order[]} userId={user.id} />;
}
