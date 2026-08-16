export type DeliveryStatus =
  | "pending"
  | "booked"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Pending",
  booked: "Booked",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

export type DeliveryAddress = {
  name: string;
  phone: string;
  line: string;
  city: string;
  state: string;
  pincode: string;
};

export type ShipmentPackage = {
  weightKg: number;
  notes?: string;
};

export type CreateShipmentInput = {
  orderId: string;
  orderNumber: string;
  pickup: DeliveryAddress;
  delivery: DeliveryAddress;
  package: ShipmentPackage;
  /** Persisted order.shipping_amount — do not recalculate checkout shipping. */
  shippingAmount?: number;
};

export type ShipmentQuoteInput = CreateShipmentInput;

export type ShipmentQuote = {
  provider: string;
  estimatedAmount: number;
  currency: string;
  estimatedDeliveryLabel: string;
  distanceKm?: number;
};

export type ShipmentResult = {
  provider: string;
  shipmentId: string;
  trackingNumber: string;
  status: DeliveryStatus;
  estimatedDeliveryLabel?: string;
  raw?: Record<string, unknown>;
};

export type TrackShipmentResult = {
  shipmentId: string;
  trackingNumber: string;
  status: DeliveryStatus;
  statusLabel: string;
  lastUpdate?: string;
  raw?: Record<string, unknown>;
};

export interface DeliveryProvider {
  readonly id: string;
  readonly displayName: string;
  getQuote(input: ShipmentQuoteInput): Promise<ShipmentQuote>;
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  trackShipment(shipmentId: string): Promise<TrackShipmentResult>;
  cancelShipment(shipmentId: string): Promise<{ success: boolean; message?: string }>;
}
