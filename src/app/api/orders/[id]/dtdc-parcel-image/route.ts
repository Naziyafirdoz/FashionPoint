import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase";
import { isAdminUser } from "@/lib/auth/helpers";
import { uploadDtdcParcelImage, isCloudinaryConfigured } from "@/lib/cloudinary";
import { normalizeOrderRecord } from "@/lib/orders/normalize-order";
import { validateDtdcParcelImageUpload } from "@/lib/orders/dtdc-parcel-image";
import {
  buildShippingAddressWithDtdcParcel,
  isCloudinaryHttpsImageUrl
} from "@/lib/orders/dtdc-parcel-metadata";
import { attachOrderFulfillmentZone } from "@/lib/orders/order-fulfillment-zone";
import { isLocalFulfillmentOrder } from "@/lib/orders/fulfillment-workflow";
import type { Order } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await isAdminUser(user.id);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  if (!isCloudinaryConfigured) {
    return NextResponse.json(
      { error: "Image storage is not configured. DTDC parcel photos cannot be saved." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const { data: existing, error: fetchError } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const existingWithZone = await attachOrderFulfillmentZone(db, existing as Order);
  if (isLocalFulfillmentOrder(existingWithZone)) {
    return NextResponse.json(
      { error: "DTDC parcel images are only used for outstation orders." },
      { status: 400 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a DTDC parcel image to upload." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateDtdcParcelImageUpload({
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    bytes: new Uint8Array(buffer)
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const dataUrl = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
  let imageUrl: string | null = null;
  try {
    imageUrl = await uploadDtdcParcelImage(dataUrl);
  } catch (error) {
    console.error("[dtdc-parcel-image] cloudinary upload failed", {
      orderId: id,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Unable to upload DTDC parcel image" }, { status: 502 });
  }

  if (!isCloudinaryHttpsImageUrl(imageUrl)) {
    return NextResponse.json({ error: "Unable to upload DTDC parcel image" }, { status: 502 });
  }

  const shippingAddress = buildShippingAddressWithDtdcParcel(
    (existingWithZone as Order).shipping_address as Record<string, unknown> | undefined,
    {
      image_url: imageUrl,
      uploaded_at: new Date().toISOString()
    }
  );

  const { data: updated, error } = await db
    .from("orders")
    .update({
      shipping_address: shippingAddress,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[dtdc-parcel-image] save failed", { orderId: id, message: error.message });
    return NextResponse.json({ error: "Unable to save DTDC parcel image" }, { status: 500 });
  }

  const normalized = await normalizeOrderRecord(db, updated as Order, { persist: false });
  const withZone = await attachOrderFulfillmentZone(db, {
    ...normalized,
    fulfillment_zone: existingWithZone.fulfillment_zone
  });
  return NextResponse.json({
    success: true,
    order: withZone,
    image_url: imageUrl,
    message: "DTDC parcel image saved"
  });
}
