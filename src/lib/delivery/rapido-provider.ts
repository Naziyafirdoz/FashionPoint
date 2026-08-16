import { buildShippingQuote } from "@/lib/shipping/rates";
import { getShippingSettings } from "@/lib/shipping/settings";
import type {
  CreateShipmentInput,
  DeliveryProvider,
  ShipmentQuote,
  ShipmentQuoteInput,
  ShipmentResult,
  TrackShipmentResult
} from "@/lib/delivery/types";

/**
 * Rapido parcel integration stub.
 * Replace API calls with official Rapido endpoints when credentials are available.
 */
export class RapidoDeliveryProvider implements DeliveryProvider {
  readonly id = "rapido";
  readonly displayName = "Rapido";

  private get credentials() {
    const settings = getShippingSettings();
    return {
      apiKey: settings.rapidoApiKey,
      apiSecret: settings.rapidoApiSecret
    };
  }

  private assertConfigured(): void {
    const { apiKey } = this.credentials;
    if (!apiKey) {
      throw new Error(
        "Rapido API credentials are not configured. Set RAPIDO_API_KEY or configure in Admin → Settings."
      );
    }
  }

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

    // TODO: POST to Rapido quote API when available.
    return {
      provider: this.id,
      estimatedAmount: quote.shippingAmount,
      currency: "INR",
      estimatedDeliveryLabel: "",
      distanceKm: quote.isLocal ? 10 : 300
    };
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    this.assertConfigured();
    const quote = await this.getQuote(input);

    // TODO: POST to Rapido create-shipment API.
    const shipmentId = `rapido-pending-${input.orderId.slice(0, 8)}`;
    const trackingNumber = `RPD-${input.orderNumber.replace(/\D/g, "").slice(-10)}`;

    return {
      provider: this.displayName,
      shipmentId,
      trackingNumber,
      status: "booked",
      estimatedDeliveryLabel: "",
      raw: {
        mode: "rapido-stub",
        pickup: input.pickup,
        delivery: input.delivery,
        package: input.package,
        shippingAmount: input.shippingAmount
      }
    };
  }

  async trackShipment(shipmentId: string): Promise<TrackShipmentResult> {
    this.assertConfigured();

    // TODO: GET Rapido tracking API.
    return {
      shipmentId,
      trackingNumber: shipmentId,
      status: "in_transit",
      statusLabel: "In Transit",
      lastUpdate: new Date().toISOString()
    };
  }

  async cancelShipment(shipmentId: string): Promise<{ success: boolean; message?: string }> {
    this.assertConfigured();
    return { success: true, message: `Rapido shipment ${shipmentId} cancellation requested` };
  }
}
