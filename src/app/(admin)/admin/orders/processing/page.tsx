import { redirect } from "next/navigation";

export default function ProcessingOrdersRedirect() {
  redirect("/admin/orders?tab=processing");
}
