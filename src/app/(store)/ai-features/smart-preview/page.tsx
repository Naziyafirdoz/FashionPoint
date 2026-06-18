"use client";

import { useState } from "react";

export default function SmartPreviewPage() {
  const [comingSoon] = useState(!process.env.NEXT_PUBLIC_REPLICATE_ENABLED);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-3xl font-bold text-primary">Smart Blouse Preview</h1>
      <p className="mt-4 text-foreground/70">
        Virtual try-on powered by Replicate fashn-ai/tryon model.
      </p>
      <div className="card-store mt-8">
        <p className="text-lg font-semibold text-secondary">Coming Soon</p>
        <p className="mt-2 text-sm text-foreground/60">
          Configure REPLICATE_API_TOKEN in .env.local to enable AI-generated blouse previews on your photo.
        </p>
        <ul className="mt-4 space-y-1 text-left text-sm text-foreground/70">
          <li>• Upload front-facing selfie</li>
          <li>• Choose body type & occasion</li>
          <li>• Generate 5 style previews</li>
        </ul>
      </div>
    </div>
  );
}
