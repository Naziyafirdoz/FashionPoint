"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export default function StyleRecommenderPage() {
  const [prefs, setPrefs] = useState({
    occasion: "Wedding",
    stylePreference: "Elegant",
    neckStyle: "Boat",
    sleeveStyle: "Half",
    budget: 3000
  });
  const [results, setResults] = useState<typeof MOCK_PRODUCTS>([]);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/ai/style-chat", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs)
    });
    const data = await res.json();
    const ids = (data.recommendations ?? []).map((r: { productId: string }) => r.productId);
    setResults(MOCK_PRODUCTS.filter((p) => ids.includes(p.id)).length ? MOCK_PRODUCTS.filter((p) => ids.includes(p.id)) : MOCK_PRODUCTS.slice(0, 6));
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-primary">AI Style Recommender</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form onSubmit={submit} className="card-store space-y-4">
          {[
            { key: "occasion", options: ["Wedding", "Daily", "Party", "Festive", "Office"] },
            { key: "stylePreference", options: ["Elegant", "Traditional", "Modern", "Casual"] }
          ].map(({ key, options }) => (
            <div key={key}>
              <label className="text-sm font-semibold capitalize">{key}</label>
              <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={prefs[key as keyof typeof prefs] as string} onChange={(e) => setPrefs({ ...prefs, [key]: e.target.value })}>
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="text-sm font-semibold">Budget: ₹{prefs.budget}</label>
            <input type="range" min={500} max={5000} value={prefs.budget} onChange={(e) => setPrefs({ ...prefs, budget: Number(e.target.value) })} className="w-full" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Finding styles..." : "GET RECOMMENDATIONS"}
          </button>
        </form>
        <div>
          <p className="font-semibold text-primary">2. Recommended Styles For You</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {results.map((p, i) => (
              <div key={p.id} className="card-store">
                <span className="text-xs font-bold text-secondary">#{i + 1}</span>
                <div className="relative mt-2 aspect-square overflow-hidden rounded-lg bg-blush">
                  {p.images?.[0] && <Image src={p.images[0]} alt={p.name} fill className="object-cover" />}
                </div>
                <p className="mt-2 font-medium">{p.name}</p>
                <p className="text-sm text-foreground/60">{92 - i * 3}% Match</p>
                <Link href={`/product/${p.slug}`} className="mt-2 text-xs text-primary underline">View Details</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
