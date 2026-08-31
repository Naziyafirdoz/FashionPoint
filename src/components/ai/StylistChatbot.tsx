"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { StylistProductResult, StylistSessionFilters } from "@/lib/stylist-assistant/types";
import { StylistChatProductCard } from "@/components/ai/StylistChatProductCard";
import { STORE_NAME } from "@/lib/site-config";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  products?: StylistProductResult[];
};

const QUICK_CHIPS = [
  "Wedding blouse under ₹2,000",
  "Blue embroidered blouse",
  "Party wear blouse",
  "Cotton daily wear blouse",
  "Show new arrivals",
  "Best selling blouses",
  "Blouses below ₹1,500"
] as const;

function shoppingAssistantGreeting(storeName: string) {
  return `Hi! I'm your ${storeName} Shopping Assistant. Tell me the occasion, color, fabric, or budget and I'll search our live catalog.`;
}

export function StylistChatbot({ storeName = STORE_NAME }: { storeName?: string }) {
  const greeting = shoppingAssistantGreeting(storeName);
  const assistantLabel = `${storeName} Shopping Assistant`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: greeting }
  ]);
  const [sessionFilters, setSessionFilters] = useState<StylistSessionFilters>({ inStockOnly: true });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message: string, fromQuickChip = false) => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/stylist-chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionFilters, fromQuickChip })
      });

      const data = await res.json();
      setSessionFilters((data.sessionFilters ?? {}) as StylistSessionFilters);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: typeof data.reply === "string" ? data.reply : greeting,
          products: Array.isArray(data.products) ? data.products : []
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I couldn't find a matching product in our current collection."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const value = input;
    setInput("");
    await sendMessage(value);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={assistantLabel}
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open ? (
        <div
          className="fixed bottom-24 right-6 z-50 flex h-[min(520px,calc(100vh-7rem))] w-[min(360px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
          role="dialog"
          aria-label={assistantLabel}
        >
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <span className="font-semibold">{storeName} Assistant</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-[#F2E4E8] px-2 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(chip, true)}
                  className="shrink-0 rounded-full border border-[#F2E4E8] bg-[#FFFBFC] px-2.5 py-1 text-[10px] font-medium text-primary transition hover:border-primary/30 disabled:opacity-60"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`}>
                <div
                  className={`rounded-lg px-3 py-2 ${
                    message.role === "user" ? "ml-8 bg-blush" : "mr-2 bg-gray-100"
                  }`}
                >
                  {message.text}
                </div>
                {message.products?.length ? (
                  <div className="mr-2 mt-2 space-y-2">
                    {message.products.map((result) => (
                      <StylistChatProductCard key={result.product.id} result={result} />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading ? <p className="text-xs text-foreground/50">Searching our catalog…</p> : null}
          </div>

          <div className="flex gap-2 border-t p-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
              placeholder="I need a blouse for..."
              aria-label="Chat message"
              className="flex-1 rounded-full border px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="rounded-full bg-primary p-2 text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
