import { redirect } from "next/navigation";

export default function CancelledOrdersRedirect() {
  redirect("/admin/orders?tab=cancelled");
}
