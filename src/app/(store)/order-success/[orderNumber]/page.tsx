import { createClient } from "@/lib/supabase/server";
import { OrderSuccessView } from "@/components/store/OrderSuccessView";
import type { Order } from "@/types";

export const metadata = { title: "Order Placed" };

type PageProps = {
  params: Promise<{ orderNumber: string }>;
};

export default async function OrderSuccessByNumberPage({ params }: PageProps) {
  const { orderNumber } = await params;
  const trimmed = orderNumber.trim();

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let order: Order | null = null;

  if (user && trimmed) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", trimmed)
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      order = data as Order;
    }
  }

  return <OrderSuccessView order={order} hasOrderRef={Boolean(trimmed)} orderNumber={trimmed} />;
}
