import { ResetPasswordForm } from "./ResetPasswordForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function ResetPasswordPage() {
  const { storeName, logoUrl } = await getStoreInformation();
  return <ResetPasswordForm storeName={storeName} logoUrl={logoUrl} />;
}
