import { redirect } from "next/navigation";

export default function PendingOrdersRedirect() {
  redirect("/admin/orders?tab=all");
}
