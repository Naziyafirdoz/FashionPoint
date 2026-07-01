export type StockNotificationStatus = "pending" | "sent" | "cancelled";

export type StockNotificationRequest = {
  id: string;
  product_id: string;
  product_name: string | null;
  customer_name: string;
  customer_email: string;
  user_id: string | null;
  status: StockNotificationStatus;
  created_at: string;
  notified_at: string | null;
};

export type SaveStockNotificationInput = {
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  userId?: string | null;
};

export type SaveStockNotificationResult =
  | { ok: true; id: string }
  | { ok: false; code: "duplicate" | "validation" | "db"; message: string };
