import { OrderDetailClient } from "@/components/admin/orders/OrderDetailClient";
import { getStoreInformation } from "@/lib/settings/store-information";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { storeName } = await getStoreInformation();
  return <OrderDetailClient orderId={id} storeName={storeName} />;
}
