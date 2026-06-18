"use client";

import { useParams } from "next/navigation";
import { AdminEditProductClient } from "@/components/admin/AdminEditProductClient";

export default function EditProductPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  if (!id) {
    return null;
  }

  return <AdminEditProductClient productId={id} />;
}
