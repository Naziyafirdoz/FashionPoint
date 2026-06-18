import { createClient } from "@/lib/supabase/server";

import { OrderSuccessView } from "@/components/store/OrderSuccessView";

import type { Order } from "@/types";



export const metadata = { title: "Order Placed" };



type PageProps = {

  searchParams: Promise<{ order?: string }>;

};



export default async function OrderSuccessPage({ searchParams }: PageProps) {

  const { order: orderNumber } = await searchParams;



  if (!orderNumber?.trim()) {

    return <OrderSuccessView order={null} hasOrderRef={false} />;

  }



  const supabase = await createClient();

  const {

    data: { user }

  } = await supabase.auth.getUser();



  let order: Order | null = null;



  if (user) {

    const { data } = await supabase

      .from("orders")

      .select("*")

      .eq("order_number", orderNumber.trim())

      .eq("user_id", user.id)

      .maybeSingle();



    if (data) {

      order = data as Order;

    }

  }



  return <OrderSuccessView order={order} hasOrderRef={true} orderNumber={orderNumber.trim()} />;

}

