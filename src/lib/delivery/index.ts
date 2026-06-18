import { MockDeliveryProvider } from "@/lib/delivery/mock-provider";
import { RapidoDeliveryProvider } from "@/lib/delivery/rapido-provider";
import type { DeliveryProvider } from "@/lib/delivery/types";
import { getShippingSettings } from "@/lib/shipping/settings";

const mockProvider = new MockDeliveryProvider();
const rapidoProvider = new RapidoDeliveryProvider();

export function getDeliveryProvider(): DeliveryProvider {
  const { deliveryProvider, rapidoApiKey } = getShippingSettings();

  if (deliveryProvider === "rapido" && rapidoApiKey) {
    return rapidoProvider;
  }

  if (deliveryProvider === "rapido" && !rapidoApiKey) {
    console.warn("[delivery] Rapido selected but API key missing — using mock provider.");
  }

  return mockProvider;
}

export { MockDeliveryProvider, RapidoDeliveryProvider };
