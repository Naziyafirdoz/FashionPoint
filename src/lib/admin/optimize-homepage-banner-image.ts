const MAX_WIDTH = 1600;
const MAX_HEIGHT = 900;
const OUTPUT_QUALITY = 0.82;

export class HomepageBannerOptimizationError extends Error {
  constructor(message?: string) {
    super(message ?? "Failed to optimize image");
    this.name = "HomepageBannerOptimizationError";
  }
}

function getInputMime(file: File): string {
  const mime = file.type.toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return "image/jpeg";
}

function computeFitDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function canvasHasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function extensionForMime(mime: string): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return ".png";
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new HomepageBannerOptimizationError());
      },
      mime,
      quality
    );
  });
}

function resolveOutputMime(
  inputMime: string,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): string {
  if (inputMime === "image/jpeg") return "image/jpeg";
  if (inputMime === "image/webp") return "image/webp";

  // Keep PNG (with or without transparency) to avoid unnecessary conversion.
  if (inputMime === "image/png" || canvasHasTransparency(ctx, width, height)) {
    return "image/png";
  }

  return "image/png";
}

function buildOptimizedFileName(originalName: string, ext: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "homepage-banner";
  return `${base}${ext}`;
}

/**
 * Resize and compress a homepage banner image on the client before upload.
 * Fits within 1600×900, never upscales, preserves aspect ratio and format where practical.
 */
export async function optimizeHomepageBannerImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new HomepageBannerOptimizationError("Could not read image.");
  }

  try {
    const { width, height } = computeFitDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new HomepageBannerOptimizationError("Could not process image.");

    ctx.drawImage(bitmap, 0, 0, width, height);

    const inputMime = getInputMime(file);
    const outputMime = resolveOutputMime(inputMime, ctx, width, height);
    const blob = await canvasToBlob(canvas, outputMime, OUTPUT_QUALITY);

    return new File([blob], buildOptimizedFileName(file.name, extensionForMime(outputMime)), {
      type: outputMime,
      lastModified: Date.now()
    });
  } finally {
    bitmap.close();
  }
}
