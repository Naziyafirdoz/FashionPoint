import { isAcceptedImageType } from "@/lib/color-analysis";

export const COLOR_UPLOAD_MAX_IMAGES = 5;
export const COLOR_UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const COLOR_UPLOAD_ACCEPTED_TYPES_LABEL = "JPG, PNG, WEBP";

export type ColorUploadValidationCode =
  | "unsupported_format"
  | "too_large"
  | "too_many"
  | "duplicate"
  | "empty"
  | "process_failed";

export type ColorUploadValidationResult =
  | { ok: true }
  | { ok: false; code: ColorUploadValidationCode; message: string };

export function fileSignature(file: File): string {
  return `${file.name.toLowerCase()}::${file.size}::${file.lastModified}`;
}

export function validateColorUploadFile(file: File): ColorUploadValidationResult {
  if (!file || file.size <= 0) {
    return {
      ok: false,
      code: "empty",
      message: "Please choose a valid image file."
    };
  }

  if (!isAcceptedImageType(file.type)) {
    return {
      ok: false,
      code: "unsupported_format",
      message: `Unsupported format. Please upload ${COLOR_UPLOAD_ACCEPTED_TYPES_LABEL} images only.`
    };
  }

  if (file.size > COLOR_UPLOAD_MAX_FILE_BYTES) {
    return {
      ok: false,
      code: "too_large",
      message: "Image too large. Maximum file size is 10 MB per image."
    };
  }

  return { ok: true };
}

export function formatMaxFileSizeLabel(): string {
  return "10 MB per image";
}
