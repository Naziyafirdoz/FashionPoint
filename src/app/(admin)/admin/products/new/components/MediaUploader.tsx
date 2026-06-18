"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Film, ImageIcon, Upload, X } from "lucide-react";
import toast from "react-hot-toast";

const MAX_IMAGES = 8;
const MAX_VIDEOS = 2;

type MediaUploaderProps = {
  images: string[];
  videos: string[];
  onImagesChange: (images: string[]) => void;
  onVideosChange: (videos: string[]) => void;
};

async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/image", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data.url as string;
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export function MediaUploader({
  images,
  videos,
  onImagesChange,
  onVideosChange
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      setUploading(true);
      try {
        const nextImages = [...images];
        const nextVideos = [...videos];

        for (const file of list) {
          if (isImageFile(file)) {
            if (nextImages.length >= MAX_IMAGES) {
              toast.error(`Maximum ${MAX_IMAGES} images allowed`);
              break;
            }
            const url = await uploadFile(file);
            if (url) nextImages.push(url);
          } else if (isVideoFile(file)) {
            if (nextVideos.length >= MAX_VIDEOS) {
              toast.error(`Maximum ${MAX_VIDEOS} videos allowed`);
              break;
            }
            const url = await uploadFile(file);
            if (url) nextVideos.push(url);
          } else {
            toast.error(`Unsupported file type: ${file.name}`);
          }
        }

        onImagesChange(nextImages);
        onVideosChange(nextVideos);
      } catch {
        toast.error("Failed to upload file");
      } finally {
        setUploading(false);
      }
    },
    [images, videos, onImagesChange, onVideosChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      void processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    onVideosChange(videos.filter((_, i) => i !== index));
  };

  const hasMedia = images.length > 0 || videos.length > 0;

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-accent/40 bg-blush/20 hover:border-primary/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void processFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="mx-auto h-8 w-8 text-primary/60" />
        <p className="mt-3 text-sm font-medium text-foreground">
          {uploading ? "Uploading…" : "Drag & drop images or videos"}
        </p>
        <p className="mt-1 text-xs text-foreground/50">
          Up to {MAX_IMAGES} images and {MAX_VIDEOS} videos · JPG, PNG, WebP, MP4
        </p>
      </div>

      {hasMedia && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((url, index) => (
            <div
              key={`img-${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-white shadow-sm"
            >
              {url.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Image src={url} alt="" fill className="object-cover" sizes="160px" />
              )}
              <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                <ImageIcon className="inline h-3 w-3" />
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground shadow opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {videos.map((url, index) => (
            <div
              key={`vid-${url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-black shadow-sm"
            >
              <video src={url} className="h-full w-full object-cover" muted playsInline />
              <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                <Film className="inline h-3 w-3" />
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeVideo(index);
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground shadow opacity-0 transition group-hover:opacity-100"
                aria-label="Remove video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground/50">
        {images.length}/{MAX_IMAGES} images · {videos.length}/{MAX_VIDEOS} videos
      </p>
    </div>
  );
}
