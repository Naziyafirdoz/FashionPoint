import { v2 as cloudinary } from "cloudinary";

const configured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

export async function uploadImage(
  file: string,
  folder = "fashionpoint/products"
): Promise<string | null> {
  if (!configured) return null;
  const result = await cloudinary.uploader.upload(file, { folder });
  return result.secure_url;
}

export async function deleteImage(publicId: string) {
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary, configured as isCloudinaryConfigured };
