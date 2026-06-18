"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

const MAX_IMAGES = 6;

type ReviewImageUploaderProps = {
  images: string[];
  onChange: (images: string[]) => void;
};

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/image", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url as string;
}

export function ReviewImageUploader({ images, onChange }: ReviewImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setUploading(true);
    try {
      const next = [...images];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error("Only image files are allowed");
          continue;
        }
        if (next.length >= MAX_IMAGES) {
          toast.error(`Maximum ${MAX_IMAGES} photos allowed`);
          break;
        }
        const url = await uploadFile(file);
        next.push(url);
      }
      onChange(next);
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {images.map((src, index) => (
          <div key={`${src}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-lg border">
            {src.startsWith("data:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image src={src} alt="" fill className="object-cover" sizes="64px" />
            )}
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(images.filter((_, i) => i !== index))}
              className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-dashed text-[10px] text-foreground/50 disabled:opacity-50"
          >
            {uploading ? (
              <Upload className="h-4 w-4 animate-pulse" />
            ) : (
              <>
                <ImageIcon className="h-4 w-4" />
                Add
              </>
            )}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-xs text-foreground/50">Optional. Up to {MAX_IMAGES} photos.</p>
    </div>
  );
}
