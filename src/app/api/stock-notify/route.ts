import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendWhatsAppNotification } from "@/lib/server/whatsapp";

export async function POST(req: Request) {
  const body = await req.json();
  const db = createServiceClient();

  if (db) {
    await db.from("out_of_stock_requests").insert({
      product_id: body.product_id,
      name: body.name,
      phone: body.phone,
      email: body.email,
      bust: body.bust,
      waist: body.waist,
      shoulder: body.shoulder,
      message: body.message
    });
  }

  await sendWhatsAppNotification(
    `New stock request for ${body.product_name ?? "product"}. Customer: ${body.name}, Phone: ${body.phone}, Measurements: Bust ${body.bust ?? "-"} Waist ${body.waist ?? "-"} Shoulder ${body.shoulder ?? "-"}`
  );

  return NextResponse.json({ ok: true });
}
