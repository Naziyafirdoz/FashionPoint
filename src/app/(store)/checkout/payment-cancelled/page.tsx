import { PaymentResultPage } from "@/components/store/PaymentResultPage";
import { getStoreInformation } from "@/lib/settings/store-information";

export const metadata = { title: "Payment Cancelled" };

type PageProps = {
  searchParams: Promise<{ order?: string }>;
};

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const { order } = await searchParams;
  const { storeName } = await getStoreInformation();

  return (
    <PaymentResultPage
      variant="cancelled"
      orderNumber={order?.trim() || undefined}
      storeName={storeName}
    />
  );
}
