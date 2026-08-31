import { ResetPasswordForm } from "./ResetPasswordForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function ResetPasswordPage() {
  const { storeName } = await getStoreInformation();
  return <ResetPasswordForm storeName={storeName} />;
}
