import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  isCloudinaryConfigured,
  STORE_LOGO_CLOUDINARY_FOLDER,
  uploadStoreLogo
} from "@/lib/cloudinary";
import { validateStoreLogoUpload } from "@/lib/settings/store-logo-upload";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!isCloudinaryConfigured) {
    return NextResponse.json(
      { error: "Image storage is not configured. Store logos cannot be uploaded." },
      { status: 503 }
    );
  }

  const form = await req.formData().catch(() => null);
  let file: File | null = null;
  if (form) {
    for (const [key, value] of form) {
      if (key === "file" && value instanceof File) {
        file = value;
        break;
      }
    }
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Please choose a PNG, JPG, or WebP image." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateStoreLogoUpload({
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
    imageUrl = await uploadStoreLogo(dataUrl);
  } catch (error) {
    console.error("[admin/store-information/logo] cloudinary upload failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: "Unable to upload store logo" }, { status: 502 });
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "Unable to upload store logo" }, { status: 502 });
  }

  return NextResponse.json({
    url: imageUrl,
    folder: STORE_LOGO_CLOUDINARY_FOLDER
  });
}
