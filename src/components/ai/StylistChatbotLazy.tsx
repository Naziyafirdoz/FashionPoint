"use client";

import dynamic from "next/dynamic";

const StylistChatbot = dynamic(
  () => import("./StylistChatbot").then((mod) => mod.StylistChatbot),
  { ssr: false }
);

export function StylistChatbotLazy({ storeName }: { storeName: string }) {
  return <StylistChatbot storeName={storeName} />;
}
