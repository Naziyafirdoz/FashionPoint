import { NextResponse } from "next/server";
import { lookupPincode, normalizePincode } from "@/lib/shipping/pincode-lookup";

type RouteParams = {
  params: Promise<{ pincode: string }>;
};

export async function GET(_req: Request, { params }: RouteParams) {
  const { pincode: rawPincode } = await params;
  const pincode = normalizePincode(rawPincode);

  if (pincode.length !== 6) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  const result = await lookupPincode(pincode);
  if (!result) {
    return NextResponse.json({ error: "Pincode not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
