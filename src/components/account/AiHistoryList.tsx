import Link from "next/link";
import Image from "next/image";
import { Crown, Palette, Sparkles, Ruler } from "lucide-react";
import type { AiInteraction } from "@/types";

const FEATURE_LABELS: Record<string, string> = {
  size_finder: "Size Finder",
  color_matcher: "Color Matcher",
  style_assistant: "Style Assistant"
};

const FEATURE_ICONS: Record<string, typeof Ruler> = {
  size_finder: Ruler,
  color_matcher: Palette,
  style_assistant: Sparkles
};

type AiHistoryListProps = {
  interactions: AiInteraction[];
};

export function AiHistoryList({ interactions }: AiHistoryListProps) {
  if (!interactions.length) {
    return (
      <div className="card-store mt-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-12 w-12 text-primary" strokeWidth={1.5} />
        </div>
        <p className="mt-6 text-lg font-medium text-primary">Your AI fashion journey starts here</p>
        <p className="mt-2 text-sm text-foreground/70">
          Try our AI tools to find your perfect size, match colors, and get style advice.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/ai-features/size-finder" className="btn-primary">
            Size Finder
          </Link>
          <Link href="/ai-features/color-matcher" className="btn-outline">
            Color Matcher
          </Link>
          <Link href="/ai-features/style-recommender" className="btn-outline">
            Style Assistant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {interactions.map((item) => (
        <HistoryCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function HistoryCard({ item }: { item: AiInteraction }) {
  const Icon = FEATURE_ICONS[item.feature] ?? Sparkles;
  const label = FEATURE_LABELS[item.feature] ?? item.feature;
  const date = new Date(item.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="card-store">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="font-semibold text-primary">{label}</p>
            <p className="text-xs text-foreground/60">{date}</p>
          </div>
        </div>
      </div>
      <div className="mt-4">{renderContent(item)}</div>
    </div>
  );
}

function renderContent(item: AiInteraction) {
  switch (item.feature) {
    case "size_finder":
      return <SizeFinderContent item={item} />;
    case "color_matcher":
      return <ColorMatcherContent item={item} />;
    case "style_assistant":
      return <StyleAssistantContent item={item} />;
    default:
      return <p className="text-sm text-foreground/60">AI interaction</p>;
  }
}

function SizeFinderContent({ item }: { item: AiInteraction }) {
  const input = (item.input_data ?? {}) as Record<string, string>;
  const output = (item.output_data ?? {}) as { size?: string; confidence?: number };

  const measurements = [
    input.bust && `Bust ${input.bust}"`,
    input.underbust && `Underbust ${input.underbust}"`,
    input.waist && `Waist ${input.waist}"`,
    input.shoulder && `Shoulder ${input.shoulder}"`
  ].filter(Boolean);

  return (
    <div className="space-y-2 text-sm">
      <p className="flex items-center gap-2 font-medium text-primary">
        <Crown className="h-4 w-4 text-secondary" />
        Recommended size: {output.size ?? "—"}
        {output.confidence != null ? (
          <span className="text-xs font-normal text-foreground/60">({output.confidence}% confidence)</span>
        ) : null}
      </p>
      {measurements.length ? (
        <p className="text-foreground/70">Measurements: {measurements.join(" · ")}</p>
      ) : null}
    </div>
  );
}

function ColorMatcherContent({ item }: { item: AiInteraction }) {
  const input = item.input_data as { imageUrl?: string; imageUrls?: string[] } | undefined;
  const output = item.output_data as {
    detectedColors?: {
      name: string;
      hex: string;
      percent?: number;
      displayLabel?: string;
      confidence?: number;
      uncertain?: boolean;
    }[];
    recommendations?: {
      name: string;
      hex: string;
      matchPercent?: number;
      matchType?: string;
      reason?: string;
    }[];
    colors?: { name: string; hex: string; matchPercent?: number }[];
  } | undefined;

  const imageUrls = input?.imageUrls ?? (input?.imageUrl ? [input.imageUrl] : []);
  const detected = output?.detectedColors ?? [];
  const recommendations: {
    name: string;
    hex: string;
    matchPercent?: number;
    matchType?: string;
    reason?: string;
  }[] = output?.recommendations ?? output?.colors ?? [];

  return (
    <div className="space-y-3 text-sm">
      {imageUrls.length ? (
        <div className="flex flex-wrap gap-2">
          {imageUrls.slice(0, 3).map((url) => (
            <div
              key={url}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-accent/20 bg-blush"
            >
              <Image src={url} alt="Uploaded saree" fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      ) : null}
      {detected.length ? (
        <div>
          <p className="font-medium text-foreground/80">Detected colors:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {detected.map((c) => (
              <span
                key={`${c.hex}-detected`}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 px-2.5 py-1 text-xs"
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: c.hex }}
                />
                {c.displayLabel ? `${c.displayLabel}: ` : ""}
                {c.name}
                {c.percent != null && c.percent > 0 ? ` (${c.percent}%)` : ""}
                {c.confidence != null ? ` · ${c.confidence}%` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {recommendations.length ? (
        <div>
          <p className="font-medium text-foreground/80">Blouse recommendations:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendations.slice(0, 5).map((c) => (
              <span
                key={`${c.hex}-rec`}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 px-2.5 py-1 text-xs"
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
                {c.matchPercent != null ? ` (${c.matchPercent}%)` : ""}
                {c.matchType ? ` · ${c.matchType}` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-foreground/60">No color results recorded</p>
      )}
    </div>
  );
}

function StyleAssistantContent({ item }: { item: AiInteraction }) {
  const input = item.input_data ?? {};
  const output = item.output_data ?? {};

  const message = typeof input.message === "string" ? input.message : null;
  const reply = typeof output.reply === "string" ? output.reply : null;

  if (message) {
    return (
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">You asked</p>
          <p className="mt-1 text-foreground/80">{message}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">AI response</p>
          <p className="mt-1 text-foreground/80">{reply ?? "No response recorded"}</p>
        </div>
      </div>
    );
  }

  const prefs = input as Record<string, unknown>;
  const recommendations = (output.recommendations ?? []) as {
    reason?: string;
    matchPercent?: number;
  }[];

  const promptParts = [
    prefs.occasion && `Occasion: ${prefs.occasion}`,
    prefs.stylePreference && `Style: ${prefs.stylePreference}`,
    prefs.neckStyle && `Neck: ${prefs.neckStyle}`,
    prefs.sleeveStyle && `Sleeves: ${prefs.sleeveStyle}`,
    prefs.budget != null && `Budget: ₹${prefs.budget}`
  ].filter(Boolean);

  const responseSummary =
    recommendations.length > 0
      ? `${recommendations.length} style recommendation${recommendations.length === 1 ? "" : "s"}${recommendations[0]?.reason ? ` — ${recommendations[0].reason}` : ""}`
      : "Style recommendations generated";

  return (
    <div className="space-y-2 text-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Your preferences</p>
        <p className="mt-1 text-foreground/80">
          {promptParts.length ? promptParts.join(" · ") : "Style preferences submitted"}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">AI response</p>
        <p className="mt-1 text-foreground/80">{responseSummary}</p>
      </div>
    </div>
  );
}
