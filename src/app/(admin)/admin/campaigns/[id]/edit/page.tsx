"use client";

import { useParams } from "next/navigation";
import { CampaignEditClient } from "@/components/admin/campaigns/CampaignEditClient";

export default function AdminEditCampaignPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  if (!id) {
    return null;
  }

  return <CampaignEditClient campaignId={id} />;
}
