import { PaymentResultPage } from "@/components/store/PaymentResultPage";

export const metadata = { title: "Payment Cancelled" };

type PageProps = {
  searchParams: Promise<{ order?: string }>;
};

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const { order } = await searchParams;

  return (
    <PaymentResultPage
      variant="cancelled"
      orderNumber={order?.trim() || undefined}
    />
  );
}
