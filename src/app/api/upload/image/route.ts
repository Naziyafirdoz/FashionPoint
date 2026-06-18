import { NextResponse } from "next/server";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

  if (isCloudinaryConfigured) {
    const url = await uploadImage(base64);
    if (url) return NextResponse.json({ url });
  }

  // Dev fallback: return the uploaded file as a data URL (no external placeholder host).
  return NextResponse.json({ url: base64 });
}
