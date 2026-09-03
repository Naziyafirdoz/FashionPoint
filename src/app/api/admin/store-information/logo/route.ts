import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import {
  isCloudinaryConfigured,
  STORE_LOGO_CLOUDINARY_FOLDER,
  uploadStoreLogo
} from "@/lib/cloudinary";
import { validateStoreLogoUpload } from "@/lib/settings/store-logo-upload";

function getFormFile(form: unknown, name: string): File | null {
  if (!form || typeof form !== "object") return null;
  const getter = form as { get?: (field: string) => unknown };
  if (typeof getter.get !== "function") return null;
  const uploaded = getter.get(name);
  return uploaded instanceof File ? uploaded : null;
}

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
  const file = getFormFile(form, "file");
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
