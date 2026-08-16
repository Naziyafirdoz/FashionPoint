import { NextResponse } from "next/server";
import { buildShippingQuote } from "@/lib/shipping/rates";
import { resolveAuthoritativeShipping } from "@/lib/shipping/order-shipping";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const address = {
    city: typeof body.city === "string" ? body.city : undefined,
    state: typeof body.state === "string" ? body.state : undefined,
    pincode: typeof body.pincode === "string" ? body.pincode : undefined,
    line: typeof body.line === "string" ? body.line : undefined,
    addressComponents: Array.isArray(body.addressComponents) ? body.addressComponents : undefined
  };

  if (!address.city && !address.pincode && !address.line) {
    return NextResponse.json({ error: "Address is required for shipping quote" }, { status: 400 });
  }

  const resolution = await resolveAuthoritativeShipping(address);
  const quote = buildShippingQuote(address, resolution);
  return NextResponse.json({ quote });
}
