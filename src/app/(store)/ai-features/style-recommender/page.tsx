import { StyleRecommenderClient } from "./StyleRecommenderClient";
import { getStoreInformation } from "@/lib/settings/store-information";

export default async function StyleRecommenderPage() {
  const { storeName } = await getStoreInformation();
  return <StyleRecommenderClient storeName={storeName} />;
}
