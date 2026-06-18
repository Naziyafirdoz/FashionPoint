import { OrderDetailClient } from "@/components/admin/orders/OrderDetailClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailClient orderId={id} />;
}
