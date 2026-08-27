import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter, type Href } from "expo-router";

import { AccountStackFrame } from "@/components/account/AccountStackFrame";
import { PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { resolveMediaUrl, toUserMessage } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

type AiFeature = "size_finder" | "color_matcher" | "style_assistant" | "smart_preview" | string;

type AiInteraction = {
  id: string;
  feature: AiFeature;
  input_data?: Record<string, unknown> | null;
  output_data?: Record<string, unknown> | null;
  created_at: string;
};

const FEATURE_LABELS: Record<string, string> = {
  size_finder: "Size Finder",
  color_matcher: "Color Matcher",
  style_assistant: "Style Assistant",
};

const FEATURE_HREF: Record<string, Href> = {
  size_finder: "/ai/size" as Href,
  color_matcher: "/ai/color" as Href,
  style_assistant: "/ai/style" as Href,
};

export default function AiHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AiInteraction[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from("ai_interactions")
        .select("id, feature, input_data, output_data, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) {
        throw new Error(queryError.message);
      }
      setItems((data ?? []) as AiInteraction[]);
      setError(null);
    } catch (err) {
      setError(toUserMessage(err, "Unable to load AI history."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <AccountStackFrame title="AI History">
      {!user ? (
        <StatusMessage
          title="Sign in required"
          message="Sign in to view your AI history."
          actionLabel="Sign in"
          onAction={() => router.push("/login?redirect=/ai-history" as Href)}
        />
      ) : loading ? (
        <ActivityIndicator color={Brand.maroon} style={{ marginTop: 40 }} />
      ) : error ? (
        <StatusMessage
          title="Unable to load AI history"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : items.length === 0 ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.emptyTitle}>Your AI fashion journey starts here</Text>
          <Text style={styles.copy}>
            Try our AI tools to find your perfect size, match colors, and get style advice.
          </Text>
          <PrimaryButton label="Size Finder" onPress={() => router.push("/ai/size" as Href)} />
          <PrimaryButton
            label="Color Matcher"
            variant="outline"
            onPress={() => router.push("/ai/color" as Href)}
          />
          <PrimaryButton
            label="Style Assistant"
            variant="outline"
            onPress={() => router.push("/ai/style" as Href)}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.copy}>
            Your past Size Finder, Color Matcher, and Style Assistant sessions.
          </Text>
          {items.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              onOpen={() => {
                const href = FEATURE_HREF[item.feature];
                if (href) router.push(href);
              }}
            />
          ))}
        </ScrollView>
      )}
    </AccountStackFrame>
  );
}

function HistoryCard({
  item,
  onOpen,
}: {
  item: AiInteraction;
  onOpen: () => void;
}) {
  const label = FEATURE_LABELS[item.feature] ?? item.feature;
  const date = new Date(item.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const canOpen = Boolean(FEATURE_HREF[item.feature]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{label}</Text>
      <Text style={styles.meta}>{date}</Text>
      {renderContent(item)}
      {canOpen ? (
        <Pressable onPress={onOpen} accessibilityRole="button" style={styles.openLink}>
          <Text style={styles.openText}>Open {label}</Text>
        </Pressable>
      ) : null}
    </View>
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
      return <Text style={styles.copy}>AI interaction</Text>;
  }
}

function SizeFinderContent({ item }: { item: AiInteraction }) {
  const input = (item.input_data ?? {}) as Record<string, string>;
  const output = (item.output_data ?? {}) as { size?: string; confidence?: number };
  const measurements = [
    input.bust && `Bust ${input.bust}"`,
    input.underbust && `Underbust ${input.underbust}"`,
    input.waist && `Waist ${input.waist}"`,
    input.shoulder && `Shoulder ${input.shoulder}"`,
  ].filter(Boolean);

  return (
    <View style={styles.block}>
      <Text style={styles.result}>
        Recommended size: {output.size ?? "—"}
        {output.confidence != null ? ` (${output.confidence}% confidence)` : ""}
      </Text>
      {measurements.length ? <Text style={styles.copy}>Measurements: {measurements.join(" · ")}</Text> : null}
    </View>
  );
}

function ColorMatcherContent({ item }: { item: AiInteraction }) {
  const input = item.input_data as { imageUrl?: string; imageUrls?: string[] } | undefined;
  const output = item.output_data as
    | {
        detectedColors?: { name: string; hex: string; percent?: number; displayLabel?: string }[];
        recommendations?: { name: string; hex: string; matchPercent?: number; matchType?: string }[];
        colors?: { name: string; hex: string; matchPercent?: number }[];
      }
    | undefined;
  const imageUrls = input?.imageUrls ?? (input?.imageUrl ? [input.imageUrl] : []);
  const detected = output?.detectedColors ?? [];
  const recommendations = output?.recommendations ?? output?.colors ?? [];

  return (
    <View style={styles.block}>
      {imageUrls.length ? (
        <View style={styles.swatchRow}>
          {imageUrls.slice(0, 3).map((url) => {
            const resolved = resolveMediaUrl(url);
            return resolved ? (
              <Image key={url} source={{ uri: resolved }} style={styles.thumb} contentFit="cover" />
            ) : null;
          })}
        </View>
      ) : null}
      {detected.length ? (
        <>
          <Text style={styles.subhead}>Detected colors:</Text>
          <View style={styles.swatchRow}>
            {detected.map((color) => (
              <ColorChip
                key={`${color.hex}-detected`}
                hex={color.hex}
                label={`${color.displayLabel ? `${color.displayLabel}: ` : ""}${color.name}${
                  color.percent != null && color.percent > 0 ? ` (${color.percent}%)` : ""
                }`}
              />
            ))}
          </View>
        </>
      ) : null}
      {recommendations.length ? (
        <>
          <Text style={styles.subhead}>Blouse recommendations:</Text>
          <View style={styles.swatchRow}>
            {recommendations.slice(0, 5).map((color) => (
              <ColorChip
                key={`${color.hex}-rec`}
                hex={color.hex}
                label={`${color.name}${color.matchPercent != null ? ` (${color.matchPercent}%)` : ""}`}
              />
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.copy}>No color results recorded</Text>
      )}
    </View>
  );
}

function StyleAssistantContent({ item }: { item: AiInteraction }) {
  const input = item.input_data ?? {};
  const output = item.output_data ?? {};
  const message = typeof input.message === "string" ? input.message : null;
  const reply = typeof output.reply === "string" ? output.reply : null;

  if (message) {
    return (
      <View style={styles.block}>
        <Text style={styles.subhead}>You asked</Text>
        <Text style={styles.copy}>{message}</Text>
        <Text style={styles.subhead}>AI response</Text>
        <Text style={styles.copy}>{reply ?? "No response recorded"}</Text>
      </View>
    );
  }

  const prefs = input as Record<string, unknown>;
  const recommendations = (output.recommendations ?? []) as { reason?: string }[];
  const promptParts = [
    prefs.occasion && `Occasion: ${prefs.occasion}`,
    prefs.stylePreference && `Style: ${prefs.stylePreference}`,
    prefs.neckStyle && `Neck: ${prefs.neckStyle}`,
    prefs.sleeveStyle && `Sleeves: ${prefs.sleeveStyle}`,
    prefs.budget != null && `Budget: ₹${prefs.budget}`,
  ].filter(Boolean);
  const responseSummary =
    recommendations.length > 0
      ? `${recommendations.length} style recommendation${recommendations.length === 1 ? "" : "s"}${
          recommendations[0]?.reason ? ` — ${recommendations[0].reason}` : ""
        }`
      : "Style recommendations generated";

  return (
    <View style={styles.block}>
      <Text style={styles.subhead}>Your preferences</Text>
      <Text style={styles.copy}>
        {promptParts.length ? promptParts.join(" · ") : "Style preferences submitted"}
      </Text>
      <Text style={styles.subhead}>AI response</Text>
      <Text style={styles.copy}>{responseSummary}</Text>
    </View>
  );
}

function ColorChip({ hex, label }: { hex: string; label: string }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: hex }]} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  copy: { color: Brand.muted, fontSize: 14, lineHeight: 20 },
  emptyTitle: {
    fontFamily: Brand.displayFont,
    fontSize: 22,
    color: Brand.maroon,
    textAlign: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontWeight: "700", color: Brand.maroon, fontSize: 16 },
  meta: { color: Brand.muted, fontSize: 12 },
  block: { gap: 8 },
  result: { fontWeight: "700", color: Brand.maroon },
  subhead: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Brand.muted,
    marginTop: 4,
  },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: Brand.blush },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  chipText: { fontSize: 12, color: Brand.ink },
  openLink: { marginTop: 4 },
  openText: { color: Brand.maroon, fontWeight: "700" },
});
