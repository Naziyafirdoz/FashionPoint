import { SignupForm } from "./SignupForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function SignupPage() {
  const { storeName } = await getStoreInformation();
  return <SignupForm storeName={storeName} />;
}
