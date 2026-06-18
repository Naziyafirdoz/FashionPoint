import type { DetectedColor } from "@/lib/color-analysis";

export function buildPaletteInsights(colors: DetectedColor[]): string[] {
  const primary = colors.find((c) => c.role === "primary");
  const border = colors.find((c) => c.role === "secondary" && !c.uncertain);
  const insights: string[] = [];

  if (border?.name.includes("Silver")) {
    insights.push("Silver creates elegant contrast");
  } else if (border?.name.includes("Gold")) {
    insights.push("Gold zari enhances richness");
  } else if (border?.name.includes("Rose Gold")) {
    insights.push("Rose gold adds a soft festive glow");
  } else if (border?.name.includes("Copper")) {
    insights.push("Copper tones bring warm heritage charm");
  }

  const primaryName = primary?.name.toLowerCase() ?? "";
  if (primaryName.includes("navy") || primaryName.includes("blue")) {
    insights.push("Navy gives a premium appearance");
  } else if (primaryName.includes("rich red") || primaryName.includes("red")) {
    insights.push("Rich red pairs beautifully with classic zari");
  } else if (primaryName.includes("green") || primaryName.includes("emerald")) {
    insights.push("Green fabric looks stunning with metallic accents");
  } else if (primaryName.includes("pink") || primaryName.includes("rose")) {
    insights.push("Pink tones feel fresh and celebration-ready");
  }

  if (border?.name.includes("Zari") && !insights.some((line) => line.includes("zari"))) {
    insights.push("Zari detailing elevates the overall look");
  }

  return insights.slice(0, 3);
}
