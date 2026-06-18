import Image from "next/image";

type ProductImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function ProductImage({
  src,
  alt,
  className = "object-cover",
  sizes,
  priority
}: ProductImageProps) {
  if (src.startsWith("data:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} />
    );
  }

  return (
    <Image src={src} alt={alt} fill className={className} sizes={sizes} priority={priority} />
  );
}
