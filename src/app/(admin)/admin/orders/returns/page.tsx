import { redirect } from "next/navigation";

export default function ReturnsOrdersRedirect() {
  redirect("/admin/orders");
}
