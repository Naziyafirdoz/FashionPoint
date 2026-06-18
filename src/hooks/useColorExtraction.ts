"use client";

import { useCallback, useRef, useState } from "react";
import {
  IMAGE_SLOT_LABELS,
  slotForIndex,
  type ImageSlot
} from "@/config/color-upload-slots";
import {
  compressImageFile,
  extractColorsFromImages,
  isAcceptedImageType,
  type DetectedColor
} from "@/lib/color-analysis";

export type UploadedImage = {
  id: string;
  file: File;
  previewUrl: string;
  remoteUrl?: string;
  slot: ImageSlot;
  status: "pending" | "uploading" | "ready" | "error";
  progress: number;
};

const MAX_IMAGES = 5;

function createId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getImageSlotLabel(slot: ImageSlot): string {
  return IMAGE_SLOT_LABELS[slot];
}

export function useColorExtraction() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [detectedColors, setDetectedColors] = useState<DetectedColor[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, DetectedColor[]>>(new Map());

  const revokePreview = useCallback((previewUrl: string) => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const list = Array.from(files);
      const remaining = MAX_IMAGES - images.length;

      if (remaining <= 0) {
        setError(`You can upload up to ${MAX_IMAGES} images.`);
        return;
      }

      const accepted = list.filter((file) => {
        if (!isAcceptedImageType(file.type)) {
          setError("Only JPG, PNG, and WEBP images are supported.");
          return false;
        }
        return true;
      });

      const toAdd = accepted.slice(0, remaining);
      const next: UploadedImage[] = [];

      for (let i = 0; i < toAdd.length; i++) {
        const file = toAdd[i];
        try {
          const compressed = await compressImageFile(file);
          const compressedFile = new File([compressed], file.name, {
            type: compressed.type || file.type
          });
          const slotIndex = images.length + i;
          next.push({
            id: createId(),
            file: compressedFile,
            previewUrl: URL.createObjectURL(compressed),
            slot: slotForIndex(slotIndex),
            status: "pending",
            progress: 0
          });
        } catch {
          setError("Could not process one of the images. Please try another photo.");
        }
      }

      if (next.length) {
        setImages((prev) => [...prev, ...next]);
      }
    },
    [images.length]
  );

  const removeImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const target = prev.find((img) => img.id === id);
        if (target) revokePreview(target.previewUrl);
        const filtered = prev.filter((img) => img.id !== id);
        return filtered.map((img, index) => ({ ...img, slot: slotForIndex(index) }));
      });
      setDetectedColors([]);
      cacheRef.current.clear();
    },
    [revokePreview]
  );

  const moveImage = useCallback((id: string, direction: -1 | 1) => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy.map((img, idx) => ({ ...img, slot: slotForIndex(idx) }));
    });
    setDetectedColors([]);
    cacheRef.current.clear();
  }, []);

  const uploadImages = useCallback(async (): Promise<string[]> => {
    if (!images.length) return [];

    setUploading(true);
    setError(null);
    const urls: string[] = [];

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: "uploading", progress: 10 } : img
          )
        );

        const form = new FormData();
        form.append("file", image.file);

        const res = await fetch("/api/upload/image", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Image upload failed.");
        }

        urls.push(data.url);
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, remoteUrl: data.url, status: "ready", progress: 100 }
              : img
          )
        );
      }

      return urls;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
      setImages((prev) =>
        prev.map((img) => (img.status === "uploading" ? { ...img, status: "error" } : img))
      );
      return [];
    } finally {
      setUploading(false);
    }
  }, [images]);

  const extractColors = useCallback(async (): Promise<DetectedColor[]> => {
    if (!images.length) {
      setError("Please upload at least one saree photo.");
      return [];
    }

    setExtracting(true);
    setError(null);

    try {
      const cacheKey = images
        .map((img, index) => `${img.remoteUrl ?? img.previewUrl}|${img.slot}|${index === 0 ? 0.7 : 1.3}`)
        .join("::");
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setDetectedColors(cached);
        return cached;
      }

      const colors = await extractColorsFromImages(
        images.map((img, index) => ({
          url: img.remoteUrl ?? img.previewUrl,
          slot: img.slot,
          weight: index === 0 ? 0.7 : 1.3
        }))
      );
      if (!colors.length) {
        throw new Error("Could not detect saree colors. Try clearer photos in natural light.");
      }

      cacheRef.current.set(cacheKey, colors);
      setDetectedColors(colors);
      return colors;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Color analysis failed.";
      setError(message);
      return [];
    } finally {
      setExtracting(false);
    }
  }, [images]);

  const reset = useCallback(() => {
    images.forEach((img) => revokePreview(img.previewUrl));
    setImages([]);
    setDetectedColors([]);
    setError(null);
    cacheRef.current.clear();
  }, [images, revokePreview]);

  return {
    images,
    detectedColors,
    extracting,
    uploading,
    error,
    setError,
    addFiles,
    removeImage,
    moveImage,
    uploadImages,
    extractColors,
    reset,
    maxImages: MAX_IMAGES,
    canAddMore: images.length < MAX_IMAGES
  };
}
