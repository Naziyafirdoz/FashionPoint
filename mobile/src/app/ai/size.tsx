import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StackHeader } from "@/components/navigation/StackHeader";
import { Field, PrimaryButton } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";
import { apiFetch, toUserMessage } from "@/lib/api";

type SizeResult = {
  recommendedSize?: string;
  size?: string;
  confidenceLabel?: string;
  explanations?: string[];
  shopSizeSlug?: string;
};

export default function SizeFinderScreen() {
  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [shoulder, setShoulder] = useState("");
  const [underbust, setUnderbust] = useState("");
  const [fitPreference, setFitPreference] = useState<"fitted" | "regular" | "loose">("regular");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SizeResult | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SizeResult>("/api/ai/size-finder", {
        method: "POST",
        auth: "none",
        body: JSON.stringify({
          input: {
            bust: Number(bust),
            waist: Number(waist),
            shoulder: Number(shoulder),
            underbust: underbust ? Number(underbust) : undefined,
            fitPreference,
          },
        }),
      });
      setResult(data);
    } catch (err) {
      setError(toUserMessage(err, "Size finder is unavailable right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <StackHeader title="AI Size Finder" />
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.copy}>Enter your measurements in inches. We use the website size chart.</Text>
            <Field label="Bust" value={bust} onChangeText={setBust} keyboardType="numeric" />
            <Field label="Waist" value={waist} onChangeText={setWaist} keyboardType="numeric" />
            <Field label="Shoulder" value={shoulder} onChangeText={setShoulder} keyboardType="numeric" />
            <Field label="Underbust (optional)" value={underbust} onChangeText={setUnderbust} keyboardType="numeric" />
            <View style={styles.fits}>
              {(["fitted", "regular", "loose"] as const).map((fit) => (
                <PrimaryButton
                  key={fit}
                  label={fit}
                  variant={fitPreference === fit ? "solid" : "outline"}
                  onPress={() => setFitPreference(fit)}
                />
              ))}
            </View>
            <PrimaryButton
              label={loading ? "Finding size..." : "Find my size"}
              onPress={() => void submit()}
              disabled={loading}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {result ? (
              <View style={styles.result}>
                <Text style={styles.size}>{result.recommendedSize ?? result.size}</Text>
                <Text style={styles.meta}>{result.confidenceLabel}</Text>
                {(result.explanations ?? []).map((line) => (
                  <Text key={line} style={styles.copy}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  copy: { color: Brand.muted, lineHeight: 20 },
  fits: { gap: 8 },
  error: { color: "#9B1C1C" },
  result: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 16,
    gap: 8,
  },
  size: { fontFamily: Brand.displayFont, fontSize: 32, color: Brand.maroon },
  meta: { color: Brand.gold, fontWeight: "700" },
});
