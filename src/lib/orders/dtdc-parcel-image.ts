export const DTDC_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type DtdcUploadValidationError =
  | "missing"
  | "too_large"
  | "unsupported_type";

export type DtdcUploadValidationResult =
  | { ok: true }
  | { ok: false; error: DtdcUploadValidationError; message: string };

export function dtdcUploadErrorMessage(error: DtdcUploadValidationError): string {
  switch (error) {
    case "missing":
      return "Please choose a DTDC parcel image to upload.";
    case "too_large":
      return "DTDC parcel image must be 10 MB or smaller.";
    case "unsupported_type":
      return "DTDC parcel image must be a JPEG, PNG, or WebP file.";
  }
}

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
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "rejected";
  }
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "rejected";
  }

  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 256)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.includes("<svg")) {
    return "rejected";
  }

  return "unknown";
}

export function validateDtdcParcelImageUpload(input: {
  fileName?: string;
  mimeType?: string;
  sizeBytes: number;
  bytes: Uint8Array;
}): DtdcUploadValidationResult {
  if (!input.sizeBytes || input.bytes.length === 0) {
    return { ok: false, error: "missing", message: dtdcUploadErrorMessage("missing") };
  }

  if (input.sizeBytes > DTDC_MAX_UPLOAD_BYTES || input.bytes.length > DTDC_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "too_large", message: dtdcUploadErrorMessage("too_large") };
  }

  const mime = (input.mimeType ?? "").trim().toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    return { ok: false, error: "unsupported_type", message: dtdcUploadErrorMessage("unsupported_type") };
  }

  const extension = fileExtension(input.fileName);
  if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, error: "unsupported_type", message: dtdcUploadErrorMessage("unsupported_type") };
  }

  const kind = sniffImageKind(input.bytes);
  if (kind === "rejected" || kind === "unknown") {
    return { ok: false, error: "unsupported_type", message: dtdcUploadErrorMessage("unsupported_type") };
  }

  if (mime === "image/png" && kind !== "png") {
    return { ok: false, error: "unsupported_type", message: dtdcUploadErrorMessage("unsupported_type") };
  }
  if ((mime === "image/jpeg" || mime === "image/jpg") && kind !== "jpeg") {
    return { ok: false, error: "unsupported_type", message: dtdcUploadErrorMessage("unsupported_type") };
  }
  if (mime === "image/webp" && kind !== "webp") {
    return { ok: false, error: "unsupported_type", message: dtdcUploadErrorMessage("unsupported_type") };
  }

  return { ok: true };
}
