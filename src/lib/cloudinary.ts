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

export const CAMPAIGN_CLOUDINARY_FOLDER = "fashionpoint/campaigns";
export const DTDC_CLOUDINARY_FOLDER = "fashionpoint/dtdc";
export const STORE_LOGO_CLOUDINARY_FOLDER = "fashionpoint/store-logo";

const DTDC_OPTIMIZATION = {
  width: 2000,
  height: 2000,
  crop: "limit" as const,
  quality: 85
};

function isHttpsCloudinaryUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export async function uploadCampaignHeroImage(file: string): Promise<string | null> {
  if (!configured) return null;

  const result = await cloudinary.uploader.upload(file, {
    folder: CAMPAIGN_CLOUDINARY_FOLDER,
    resource_type: "image"
  });

  return isHttpsCloudinaryUrl(result.secure_url) ? result.secure_url : null;
}

export async function uploadStoreLogo(file: string): Promise<string | null> {
  if (!configured) return null;

  const result = await cloudinary.uploader.upload(file, {
    folder: STORE_LOGO_CLOUDINARY_FOLDER,
    resource_type: "image"
  });

  return isHttpsCloudinaryUrl(result.secure_url) ? result.secure_url : null;
}

/** Upload a DTDC parcel photo: longest side ≤ 2000px, quality 85, no upscale. */
export async function uploadDtdcParcelImage(file: string): Promise<string | null> {
  if (!configured) return null;

  const result = await cloudinary.uploader.upload(file, {
    folder: DTDC_CLOUDINARY_FOLDER,
    resource_type: "image",
    eager: [DTDC_OPTIMIZATION],
    eager_async: false
  });

  const eagerUrl = Array.isArray(result.eager)
    ? result.eager
        .map((entry: { secure_url?: string }) => entry?.secure_url)
        .find((url): url is string => isHttpsCloudinaryUrl(url))
    : undefined;

  if (isHttpsCloudinaryUrl(eagerUrl)) return eagerUrl;
  if (isHttpsCloudinaryUrl(result.secure_url)) return result.secure_url;
  return null;
}

export async function deleteImage(publicId: string) {
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary, configured as isCloudinaryConfigured };
