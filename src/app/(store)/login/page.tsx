import { LoginForm } from "./LoginForm";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function LoginPage() {
  const { storeName } = await getStoreInformation();
  return <LoginForm storeName={storeName} />;
}
