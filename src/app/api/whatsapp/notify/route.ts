import { NextResponse } from "next/server";
import { sendWhatsAppNotification } from "@/lib/server/whatsapp";

export async function POST(req: Request) {
  const { message } = await req.json();
  const result = await sendWhatsAppNotification(message);
  return NextResponse.json(result);
}
