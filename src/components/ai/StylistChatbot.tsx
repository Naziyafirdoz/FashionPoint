"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

export function StylistChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hi! I'm your Fashion Point stylist. Tell me about your saree or occasion!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/stylist-chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "Browse our collections for matching blouses!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-secondary hover:text-foreground"
        aria-label="AI Stylist Chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <span className="font-semibold">AI Stylist</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 ${m.role === "user" ? "ml-8 bg-blush" : "mr-8 bg-gray-100"}`}>
                {m.text}
              </div>
            ))}
            {loading && <p className="text-xs text-foreground/50">Typing...</p>}
          </div>
          <div className="flex gap-2 border-t p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="I need a blouse for..."
              className="flex-1 rounded-full border px-3 py-2 text-sm outline-none"
            />
            <button type="button" onClick={send} className="rounded-full bg-primary p-2 text-white">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
