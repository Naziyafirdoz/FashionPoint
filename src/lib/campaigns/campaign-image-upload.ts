export const CAMPAIGN_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type CampaignUploadValidationResult =
  | { ok: true }
  | { ok: false; message: string };

function fileExtension(fileName: string | undefined): string {
  const name = fileName?.trim().toLowerCase() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot);
}

function sniffImageKind(bytes: Uint8Array): "jpeg" | "png" | "webp" | "rejected" | "unknown" {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return "unknown";
}

export function validateCampaignImageUpload(input: {
  fileName?: string;
  mimeType?: string;
  sizeBytes: number;
  bytes: Uint8Array;
}): CampaignUploadValidationResult {
  if (!input.sizeBytes || input.bytes.length === 0) {
    return { ok: false, message: "Please choose a campaign image to upload." };
  }
  if (input.sizeBytes > CAMPAIGN_MAX_UPLOAD_BYTES) {
    return { ok: false, message: "Campaign image must be 10 MB or smaller." };
  }

  const mime = input.mimeType?.trim().toLowerCase() ?? "";
  const extension = fileExtension(input.fileName);
  const mimeOk = !mime || ALLOWED_MIME_TYPES.has(mime);
  const extensionOk = !extension || ALLOWED_EXTENSIONS.has(extension);
  if (!mimeOk || !extensionOk) {
    return { ok: false, message: "Campaign image must be a JPG, PNG, or WEBP file." };
  }

  const kind = sniffImageKind(input.bytes);
  if (kind === "rejected" || kind === "unknown") {
    return { ok: false, message: "Campaign image must be a JPG, PNG, or WEBP file." };
  }

  return { ok: true };
}
