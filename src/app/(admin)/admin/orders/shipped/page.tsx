import { redirect } from "next/navigation";

export default function ShippedOrdersRedirect() {
  redirect("/admin/orders?tab=shipped");
}
