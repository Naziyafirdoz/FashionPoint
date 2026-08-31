import { AdminLoginForm } from "./AdminLoginForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function AdminLoginPage() {
  const { storeName } = await getStoreInformation();
  return <AdminLoginForm storeName={storeName} />;
}
