import { OrderDetailClient } from "@/components/admin/orders/OrderDetailClient";
import {
  fetchStoreInformationShipmentSource,
  getStoreInformation
} from "@/lib/settings/store-information";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [info, shippingOrigin] = await Promise.all([
    getStoreInformation(),
    fetchStoreInformationShipmentSource()
  ]);
  return (
    <OrderDetailClient
      orderId={id}
      storeName={info.storeName}
      shippingOrigin={{
        storeName: shippingOrigin.storeName || info.storeName,
        address: shippingOrigin.address
      }}
    />
  );
}
