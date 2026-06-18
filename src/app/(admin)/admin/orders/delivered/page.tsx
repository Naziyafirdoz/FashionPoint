import { redirect } from "next/navigation";

export default function DeliveredOrdersRedirect() {
  redirect("/admin/orders?tab=delivered");
}
