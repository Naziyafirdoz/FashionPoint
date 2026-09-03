"use client";

import { useParams } from "next/navigation";
import { OfferEditClient } from "@/components/admin/offers/OfferEditClient";

export default function AdminEditOfferPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  if (!id) {
    return null;
  }

  return <OfferEditClient offerId={id} />;
}
