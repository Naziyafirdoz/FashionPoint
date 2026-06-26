"use client";

import dynamic from "next/dynamic";

export const StylistChatbotLazy = dynamic(
  () => import("./StylistChatbot").then((mod) => mod.StylistChatbot),
  { ssr: false }
);
