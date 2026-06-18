/** Client-side QR detection for refund QR uploads. */
export async function fileContainsQrCode(file: File): Promise<boolean> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxDim = 1200;
    let width = bitmap.width;
    let height = bitmap.height;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    ctx.drawImage(bitmap, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const jsQR = (await import("jsqr")).default;
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth"
    });
    return result !== null;
  } finally {
    bitmap.close();
  }
}
