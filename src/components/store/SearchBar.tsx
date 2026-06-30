"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal
        });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }, 275);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return (
    <div className="relative mx-auto max-w-xl">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && router.push(`/search?q=${encodeURIComponent(q)}`)}
        placeholder="Search blouses by name, color, fabric..."
        className="w-full rounded-full border border-accent/40 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s}>
              <Link
                href={`/search?q=${encodeURIComponent(s)}`}
                className="block px-4 py-2 text-sm hover:bg-blush"
              >
                {s}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
