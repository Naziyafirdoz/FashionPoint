"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Msg = { role: "user" | "bot"; text: string };

function answer(q: string) {
  const s = q.toLowerCase();
  if (s.includes("wedding") || s.includes("bridal")) {
    return "For weddings: choose designer blouses with raw silk, zari work and deeper tones like maroon + rose‑gold. Add a contrast pallu for a premium look.";
  }
  if (s.includes("silk saree")) {
    return "For silk sarees: raw silk / cotton‑silk blouses work best. Prefer structured necklines and subtle zari—luxury without looking heavy.";
  }
  if (s.includes("match") || s.includes("color")) {
    return "For matching: blue saree → cream/light gold/blush tones. Red saree → maroon/rose‑gold. Black saree → rose‑gold/light gold. Want to tell me your saree color?";
  }
  if (s.includes("delivery") || s.includes("shipping")) {
    return "Shipping is calculated automatically at checkout based on your delivery address. After you place an order, you can track delivery from My Orders.";
  }
  if (s.includes("size")) {
    return "Try the AI Size Recommendation (height, weight, body type). If you share your height/weight and preferred fit (snug/regular), I’ll suggest a size.";
  }
  return "I can help with wedding picks, silk saree styling, color matching, delivery queries, and sizing. What occasion are you shopping for?";
}

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi! I'm your Fashion Point fashion assistant. Ask me about wedding blouses, saree matching, size or delivery."
    }
  ]);

  const canSend = input.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    const q = input.trim();
    setMsgs((m) => [...m, { role: "user", text: q }, { role: "bot", text: answer(q) }]);
    setInput("");
  };

  const badge = useMemo(() => (msgs.length > 1 ? "New" : null), [msgs.length]);

  return (
    <div className="fixed bottom-4 right-4 z-[90]">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-[92vw] max-w-[380px] rounded-[26px] border border-blush-100 bg-white/85 backdrop-blur-xl shadow-soft overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-blush-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-blush-100 grid place-items-center text-maroon">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-maroon">
                    Fashion Assistant
                  </div>
                  <div className="text-[11px] text-maroon/60">
                    AI demo • instant answers
                  </div>
                </div>
              </div>
              <button
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-full border border-blush-100 bg-white/70 hover:bg-white transition grid place-items-center text-maroon"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[320px] overflow-auto px-4 py-3 space-y-3">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-sm leading-relaxed",
                    m.role === "user" ? "text-right" : "text-left"
                  )}
                >
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-4 py-2 border",
                      m.role === "user"
                        ? "bg-maroon text-white border-maroon"
                        : "bg-white/70 text-maroon border-blush-100"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-blush-100 bg-white/70">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
                  placeholder="Ask: best blouse for wedding?"
                  className="h-11 flex-1 rounded-full border border-blush-100 bg-white/80 px-4 text-sm outline-none focus:ring-2 focus:ring-roseGold/30"
                />
                <button
                  onClick={send}
                  disabled={!canSend}
                  className="h-11 w-11 rounded-full bg-maroon text-white grid place-items-center shadow-sm disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="relative h-14 w-14 rounded-full bg-maroon text-white shadow-soft grid place-items-center"
          aria-label="Open chat"
        >
          <Bot className="h-6 w-6" />
          {badge ? (
            <span className="absolute -top-2 -left-2 rounded-full bg-lightGold px-3 py-1 text-[10px] font-semibold text-maroon border border-lightGold/80">
              {badge}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}

