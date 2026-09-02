import { SignupForm } from "./SignupForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function SignupPage() {
  const { storeName, logoUrl } = await getStoreInformation();
  return <SignupForm storeName={storeName} logoUrl={logoUrl} />;
}
