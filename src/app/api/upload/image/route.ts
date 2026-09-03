import { NextResponse } from "next/server";
import { uploadImage, isCloudinaryConfigured } from "@/lib/cloudinary";

function getFormFile(form: unknown, name: string): File | null {
  if (!form || typeof form !== "object") return null;
  const getter = form as { get?: (field: string) => unknown };
  if (typeof getter.get !== "function") return null;
  const uploaded = getter.get(name);
  return uploaded instanceof File ? uploaded : null;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = getFormFile(form, "file");
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
