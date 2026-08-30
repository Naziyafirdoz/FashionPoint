import { PaymentResultPage } from "@/components/store/PaymentResultPage";
import { getStoreInformation } from "@/lib/settings/store-information";

export const metadata = { title: "Payment Failed" };

type PageProps = {
  searchParams: Promise<{ order?: string; reason?: string }>;
};

export default async function PaymentFailedPage({ searchParams }: PageProps) {
  const { order, reason } = await searchParams;
  const { storeName } = await getStoreInformation();

  return (
    <PaymentResultPage
      variant="failed"
      orderNumber={order?.trim() || undefined}
      reason={reason?.trim() || undefined}
      storeName={storeName}
    />
  );
}
