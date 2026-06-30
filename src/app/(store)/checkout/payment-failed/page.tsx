import { PaymentResultPage } from "@/components/store/PaymentResultPage";

export const metadata = { title: "Payment Failed" };

type PageProps = {
  searchParams: Promise<{ order?: string; reason?: string }>;
};

export default async function PaymentFailedPage({ searchParams }: PageProps) {
  const { order, reason } = await searchParams;

  return (
    <PaymentResultPage
      variant="failed"
      orderNumber={order?.trim() || undefined}
      reason={reason?.trim() || undefined}
    />
  );
}
