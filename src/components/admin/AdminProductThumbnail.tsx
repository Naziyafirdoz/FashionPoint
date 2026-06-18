import Image from "next/image";

export function AdminProductThumbnail({ src, alt }: { src: string | undefined; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-blush/40 text-[10px] text-foreground/50">
        No img
      </div>
    );
  }

  if (src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-12 w-12 rounded-lg border object-cover" />
    );
  }

  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-lg border">
      <Image src={src} alt={alt} fill className="object-cover" sizes="48px" />
    </div>
  );
}
