import { Box } from "lucide-react";

import { AdminProductThumbnail } from "@/components/admin/AdminProductThumbnail";

export function AdminCategoryThumbnail({
  src,
  alt
}: {
  src: string | null | undefined;
  alt: string;
}) {
  if (src) {
    return <AdminProductThumbnail src={src} alt={alt} />;
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-blush/40 text-foreground/40"
      aria-hidden
    >
      <Box className="h-5 w-5" />
    </div>
  );
}
