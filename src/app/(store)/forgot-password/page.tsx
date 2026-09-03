import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function ForgotPasswordPage() {
  const { storeName, logoUrl } = await getStoreInformation();
  return <ForgotPasswordForm storeName={storeName} logoUrl={logoUrl} />;
}
