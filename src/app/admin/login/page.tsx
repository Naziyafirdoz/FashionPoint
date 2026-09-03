import { AdminLoginForm } from "./AdminLoginForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function AdminLoginPage() {
  const { storeName, logoUrl } = await getStoreInformation();
  return <AdminLoginForm storeName={storeName} logoUrl={logoUrl} />;
}
