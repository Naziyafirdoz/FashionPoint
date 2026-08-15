import { buildShippingQuote } from "@/lib/shipping/rates";
import type {
  CreateShipmentInput,
  DeliveryProvider,
  ShipmentQuote,
  ShipmentQuoteInput,
  ShipmentResult,
  TrackShipmentResult
} from "@/lib/delivery/types";

function mockTrackingNumber(orderNumber: string): string {
  const suffix = orderNumber.replace(/\D/g, "").slice(-8).padStart(8, "0");
  return `MOCK-RPD-${suffix}`;
}

function mockShipmentId(orderId: string): string {
  return `mock-shp-${orderId.slice(0, 8)}`;
}

export class MockDeliveryProvider implements DeliveryProvider {
  readonly id = "mock";
  readonly displayName = "Mock Courier (Dev)";

  async getQuote(input: ShipmentQuoteInput): Promise<ShipmentQuote> {
    if (typeof input.shippingAmount === "number") {
      return {
        provider: this.id,
        estimatedAmount: input.shippingAmount,
        currency: "INR",
        estimatedDeliveryLabel: ""
      };
    }

    const quote = buildShippingQuote({
      city: input.delivery.city,
      pincode: input.delivery.pincode,
      line: input.delivery.line,
      state: input.delivery.state
    });

    return {
      provider: this.id,
      estimatedAmount: quote.shippingAmount,
      currency: "INR",
      estimatedDeliveryLabel: "",
      distanceKm: quote.isLocal ? 12 : 280
    };
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const quote = await this.getQuote(input);

    return {
      provider: this.displayName,
      shipmentId: mockShipmentId(input.orderId),
      trackingNumber: mockTrackingNumber(input.orderNumber),
      status: "booked",
      estimatedDeliveryLabel: "",
      raw: { mode: "mock", orderNumber: input.orderNumber, shippingAmount: input.shippingAmount }
    };
  }

  async trackShipment(shipmentId: string): Promise<TrackShipmentResult> {
    return {
      shipmentId,
      trackingNumber: shipmentId.replace("mock-shp-", "MOCK-RPD-"),
      status: "booked",
      statusLabel: "Booked",
      lastUpdate: new Date().toISOString()
    };
  }

  async cancelShipment(shipmentId: string): Promise<{ success: boolean; message?: string }> {
    return { success: true, message: `Mock shipment ${shipmentId} cancelled` };
  }
}
