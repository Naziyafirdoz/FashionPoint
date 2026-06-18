import {
  blouseHexForName,
  buildAnalysisSummary,
  type ColorAnalysisSummary,
  type DetectedColor
} from "@/lib/color-analysis";
import { slugify } from "@/lib/product-filters";

export type MatchType =
  | "DIRECT MATCH"
  | "CONTRAST MATCH"
  | "DESIGNER MATCH"
  | "TRADITIONAL MATCH";

export type BlouseColorRecommendation = {
  rank: number;
  name: string;
  slug: string;
  hex: string;
  matchPercent: number;
  matchType: MatchType;
  reason: string;
  productCount: number;
  shopUrl: string;
};

export type ColorMatchAnalysis = {
  summary: ColorAnalysisSummary;
  detectedColors: DetectedColor[];
  recommendations: BlouseColorRecommendation[];
};

type FabricFamily =
  | "BLUE"
  | "RED"
  | "GREEN"
  | "BLACK"
  | "PURPLE"
  | "PINK"
  | "CREAM"
  | "BEIGE"
  | "WHITE"
  | "ORANGE"
  | "BROWN"
  | "MAROON";

type ZariFamily = "SILVER" | "GOLD" | "ROSE_GOLD" | "COPPER" | "NONE";

type PairingRule = {
  name: string;
  matchType: MatchType;
  reason: string;
  baseScore: number;
};

const PAIRING_PROFILES: Record<string, PairingRule[]> = {
  "BLUE+SILVER": [
    {
      name: "Silver",
      matchType: "DIRECT MATCH",
      reason: "Matches the zari work and creates festive elegance.",
      baseScore: 98
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Traditional contrast pairing for navy sarees.",
      baseScore: 94
    },
    {
      name: "Wine",
      matchType: "DESIGNER MATCH",
      reason: "Premium evening look with deep regal contrast.",
      baseScore: 90
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft feminine contrast against navy tones.",
      baseScore: 87
    },
    {
      name: "Emerald Green",
      matchType: "DESIGNER MATCH",
      reason: "Rich designer contrast for statement styling.",
      baseScore: 82
    }
  ],
  "RED+GOLD": [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Matches the zari work and enhances festive richness.",
      baseScore: 98
    },
    {
      name: "Emerald Green",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic wedding pairing with red and gold sarees.",
      baseScore: 94
    },
    {
      name: "Black",
      matchType: "CONTRAST MATCH",
      reason: "Bold contrast for evening and reception looks.",
      baseScore: 90
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Harmonious depth for bridal and festive wear.",
      baseScore: 87
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Soft balance that keeps the drape looking refined.",
      baseScore: 82
    }
  ],
  "GREEN+GOLD": [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Matches the zari work and elevates festive styling.",
      baseScore: 98
    },
    {
      name: "Magenta Pink",
      matchType: "DESIGNER MATCH",
      reason: "Vibrant designer pairing for celebration wear.",
      baseScore: 94
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Timeless Indian contrast for weddings and pujas.",
      baseScore: 90
    },
    {
      name: "Black",
      matchType: "CONTRAST MATCH",
      reason: "Sharp contrast that defines the emerald body.",
      baseScore: 87
    },
    {
      name: "Beige",
      matchType: "CONTRAST MATCH",
      reason: "Understated contrast for elegant day events.",
      baseScore: 82
    }
  ],
  "BLACK+SILVER": [
    {
      name: "Silver",
      matchType: "DIRECT MATCH",
      reason: "Matches the zari work with sleek evening polish.",
      baseScore: 98
    },
    {
      name: "Red",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic festive pop against a black saree.",
      baseScore: 94
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Rich traditional contrast for wedding styling.",
      baseScore: 90
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft feminine lift against dark fabric.",
      baseScore: 87
    },
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Warm metallic accent for festive glamour.",
      baseScore: 82
    }
  ],
  "BLUE+GOLD": [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Matches gold zari and creates royal festive harmony.",
      baseScore: 98
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Traditional contrast pairing for navy sarees.",
      baseScore: 94
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft feminine contrast against navy blue.",
      baseScore: 90
    },
    {
      name: "Wine",
      matchType: "DESIGNER MATCH",
      reason: "Premium evening depth for designer drapes.",
      baseScore: 87
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Light contrast for graceful daytime styling.",
      baseScore: 82
    }
  ],
  "PINK+GOLD": [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Matches zari accents and adds celebration glow.",
      baseScore: 98
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Festive depth that complements pink sarees.",
      baseScore: 94
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Elegant soft pairing for daytime events.",
      baseScore: 90
    },
    {
      name: "Wine",
      matchType: "DESIGNER MATCH",
      reason: "Sophisticated contrast for evening wear.",
      baseScore: 87
    },
    {
      name: "Green",
      matchType: "DESIGNER MATCH",
      reason: "Fresh designer contrast for festive looks.",
      baseScore: 82
    }
  ],
  "PURPLE+GOLD": [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Matches zari detailing with royal festive charm.",
      baseScore: 98
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft contrast that brightens purple drapes.",
      baseScore: 94
    },
    {
      name: "Silver",
      matchType: "DIRECT MATCH",
      reason: "Cool metallic pairing for contemporary styling.",
      baseScore: 90
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Refined contrast for wedding ceremonies.",
      baseScore: 87
    },
    {
      name: "Wine",
      matchType: "TRADITIONAL MATCH",
      reason: "Deep traditional harmony for festive evenings.",
      baseScore: 82
    }
  ],
  "BLACK+GOLD": [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Matches gold zari with dramatic evening elegance.",
      baseScore: 98
    },
    {
      name: "Red",
      matchType: "TRADITIONAL MATCH",
      reason: "Bold festive contrast for black sarees.",
      baseScore: 94
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic wedding pairing with dark drapes.",
      baseScore: 90
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Feminine contrast against a black base.",
      baseScore: 87
    },
    {
      name: "Silver",
      matchType: "DIRECT MATCH",
      reason: "Cool metallic accent for modern styling.",
      baseScore: 82
    }
  ]
};

const FALLBACK_BY_FABRIC: Record<FabricFamily, PairingRule[]> = {
  BLUE: [
    {
      name: "Gold",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic navy and gold pairing for festive elegance.",
      baseScore: 96
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Traditional contrast pairing for blue sarees.",
      baseScore: 92
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft feminine contrast against blue fabric.",
      baseScore: 88
    },
    {
      name: "Wine",
      matchType: "DESIGNER MATCH",
      reason: "Premium evening contrast for designer drapes.",
      baseScore: 85
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Light contrast for graceful daytime styling.",
      baseScore: 82
    }
  ],
  RED: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Festive gold pairing that complements red sarees.",
      baseScore: 96
    },
    {
      name: "Green",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic wedding contrast for red drapes.",
      baseScore: 92
    },
    {
      name: "Black",
      matchType: "CONTRAST MATCH",
      reason: "Bold contrast for evening celebrations.",
      baseScore: 88
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Harmonious depth for bridal styling.",
      baseScore: 85
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Soft balance for refined festive looks.",
      baseScore: 82
    }
  ],
  GREEN: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Festive gold accent for green sarees.",
      baseScore: 96
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Vibrant contrast for celebration wear.",
      baseScore: 92
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Timeless Indian pairing for weddings.",
      baseScore: 88
    },
    {
      name: "Black",
      matchType: "CONTRAST MATCH",
      reason: "Sharp contrast that defines green fabric.",
      baseScore: 85
    },
    {
      name: "Beige",
      matchType: "CONTRAST MATCH",
      reason: "Understated contrast for elegant events.",
      baseScore: 82
    }
  ],
  BLACK: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Metallic accent for dramatic evening looks.",
      baseScore: 96
    },
    {
      name: "Silver",
      matchType: "DIRECT MATCH",
      reason: "Sleek metallic pairing for modern styling.",
      baseScore: 92
    },
    {
      name: "Red",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic festive pop against black.",
      baseScore: 88
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Rich traditional contrast for weddings.",
      baseScore: 85
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft feminine lift on dark fabric.",
      baseScore: 82
    }
  ],
  PURPLE: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Royal festive pairing for purple sarees.",
      baseScore: 96
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft contrast that brightens purple tones.",
      baseScore: 92
    },
    {
      name: "Silver",
      matchType: "DIRECT MATCH",
      reason: "Cool metallic accent for contemporary looks.",
      baseScore: 88
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Refined contrast for ceremonies.",
      baseScore: 85
    },
    {
      name: "Wine",
      matchType: "TRADITIONAL MATCH",
      reason: "Deep harmony for festive evenings.",
      baseScore: 82
    }
  ],
  PINK: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Festive gold accent for pink sarees.",
      baseScore: 96
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Festive depth for celebration wear.",
      baseScore: 92
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Elegant soft pairing for daytime events.",
      baseScore: 88
    },
    {
      name: "Wine",
      matchType: "DESIGNER MATCH",
      reason: "Sophisticated evening contrast.",
      baseScore: 85
    },
    {
      name: "Green",
      matchType: "DESIGNER MATCH",
      reason: "Fresh designer contrast for festive looks.",
      baseScore: 82
    }
  ],
  CREAM: [
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic contrast for cream sarees.",
      baseScore: 96
    },
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Warm metallic accent for festive styling.",
      baseScore: 92
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft feminine harmony for day wear.",
      baseScore: 88
    },
    {
      name: "Wine",
      matchType: "DESIGNER MATCH",
      reason: "Rich evening contrast for designer drapes.",
      baseScore: 85
    },
    {
      name: "Green",
      matchType: "DESIGNER MATCH",
      reason: "Fresh designer pairing for celebrations.",
      baseScore: 82
    }
  ],
  BEIGE: [
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Traditional contrast for beige sarees.",
      baseScore: 96
    },
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Warm accent for festive occasions.",
      baseScore: 92
    },
    {
      name: "Green",
      matchType: "DESIGNER MATCH",
      reason: "Earthy designer contrast for elegant looks.",
      baseScore: 88
    },
    {
      name: "Wine",
      matchType: "TRADITIONAL MATCH",
      reason: "Deep pairing for evening events.",
      baseScore: 85
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft feminine contrast on neutral base.",
      baseScore: 82
    }
  ],
  WHITE: [
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Classic bridal contrast for white sarees.",
      baseScore: 96
    },
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Festive metallic accent for ceremonies.",
      baseScore: 92
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Soft celebration contrast.",
      baseScore: 88
    },
    {
      name: "Navy Blue",
      matchType: "DESIGNER MATCH",
      reason: "Modern designer contrast for white drapes.",
      baseScore: 85
    },
    {
      name: "Black",
      matchType: "CONTRAST MATCH",
      reason: "Bold graphic contrast for statement looks.",
      baseScore: 82
    }
  ],
  ORANGE: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Festive harmony for orange sarees.",
      baseScore: 96
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Traditional depth for wedding styling.",
      baseScore: 92
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Soft balance for daytime celebrations.",
      baseScore: 88
    },
    {
      name: "Brown",
      matchType: "DESIGNER MATCH",
      reason: "Earthy designer pairing for festive wear.",
      baseScore: 85
    },
    {
      name: "Black",
      matchType: "CONTRAST MATCH",
      reason: "Bold contrast for evening events.",
      baseScore: 82
    }
  ],
  BROWN: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Warm metallic accent for brown sarees.",
      baseScore: 96
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Soft contrast for elegant day wear.",
      baseScore: 92
    },
    {
      name: "Beige",
      matchType: "CONTRAST MATCH",
      reason: "Tonal harmony with refined contrast.",
      baseScore: 88
    },
    {
      name: "Maroon",
      matchType: "TRADITIONAL MATCH",
      reason: "Traditional pairing for festive occasions.",
      baseScore: 85
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Feminine lift against earthy tones.",
      baseScore: 82
    }
  ],
  MAROON: [
    {
      name: "Gold",
      matchType: "DIRECT MATCH",
      reason: "Festive gold accent for maroon sarees.",
      baseScore: 96
    },
    {
      name: "Cream",
      matchType: "CONTRAST MATCH",
      reason: "Soft contrast for wedding ceremonies.",
      baseScore: 92
    },
    {
      name: "Pink",
      matchType: "CONTRAST MATCH",
      reason: "Feminine contrast on deep maroon.",
      baseScore: 88
    },
    {
      name: "Beige",
      matchType: "CONTRAST MATCH",
      reason: "Understated elegance for day events.",
      baseScore: 85
    },
    {
      name: "Black",
      matchType: "CONTRAST MATCH",
      reason: "Bold depth for evening styling.",
      baseScore: 82
    }
  ]
};

function resolveFabricFamily(colorName: string): FabricFamily {
  const n = colorName.toLowerCase();

  if (n.includes("navy") || n.includes("blue")) return "BLUE";
  if (n.includes("rich red") || (n.includes("red") && !n.includes("rose"))) return "RED";
  if (n.includes("emerald") || (n.includes("green") && !n.includes("blue"))) return "GREEN";
  if (n.includes("purple") || n.includes("violet")) return "PURPLE";
  if (n.includes("pink") || n.includes("rose") || n.includes("magenta")) return "PINK";
  if (n.includes("cream") || n.includes("ivory")) return "CREAM";
  if (n.includes("beige") || n.includes("tan")) return "BEIGE";
  if (n.includes("black") || n.includes("charcoal")) return "BLACK";
  if (n.includes("white")) return "WHITE";
  if (n.includes("orange")) return "ORANGE";
  if (n.includes("brown")) return "BROWN";
  if (n.includes("wine") || n.includes("maroon")) return "MAROON";

  return "BLUE";
}

function resolveZariFamily(border: DetectedColor | null): ZariFamily {
  if (!border || border.uncertain) return "NONE";
  const n = border.name.toLowerCase();

  if (n.includes("silver")) return "SILVER";
  if (n.includes("rose gold")) return "ROSE_GOLD";
  if (n.includes("copper")) return "COPPER";
  if (n.includes("gold")) return "GOLD";

  return "NONE";
}

function pairingKey(fabric: FabricFamily, zari: ZariFamily): string {
  if (zari === "NONE") return fabric;
  if (zari === "ROSE_GOLD" || zari === "COPPER") return `${fabric}+GOLD`;
  return `${fabric}+${zari}`;
}

function getPairingRules(fabric: FabricFamily, zari: ZariFamily): PairingRule[] {
  const key = pairingKey(fabric, zari);
  if (PAIRING_PROFILES[key]) return PAIRING_PROFILES[key];
  return FALLBACK_BY_FABRIC[fabric];
}

function scoreFromRule(rule: PairingRule, rank: number, primaryConfidence: number): number {
  const rankDrift = (rank - 1) * 2;
  const confidenceBoost = Math.round((primaryConfidence - 70) / 10);
  return Math.min(99, Math.max(75, rule.baseScore - rankDrift + confidenceBoost));
}

function isFabricEcho(name: string, primaryName: string): boolean {
  const blouse = name.toLowerCase();
  const fabric = primaryName.toLowerCase();

  if (blouse === fabric) return true;
  if (fabric.includes("navy") && blouse.includes("navy")) return true;
  if (fabric.includes("rich red") && blouse === "red") return true;
  if (fabric.includes("emerald") && blouse.includes("emerald")) return true;

  return false;
}

export function generateBlouseRecommendations(
  detectedColors: DetectedColor[]
): Omit<BlouseColorRecommendation, "productCount" | "shopUrl">[] {
  const primary = detectedColors.find((c) => c.role === "primary") ?? detectedColors[0];
  if (!primary) return [];

  const border =
    detectedColors.find((c) => c.role === "secondary" && !c.uncertain) ?? null;

  const fabric = resolveFabricFamily(primary.name);
  const zari = resolveZariFamily(border);
  const rules = getPairingRules(fabric, zari);

  const unique: PairingRule[] = [];
  for (const rule of rules) {
    if (isFabricEcho(rule.name, primary.name)) continue;
    if (unique.some((u) => u.name.toLowerCase() === rule.name.toLowerCase())) continue;
    unique.push(rule);
    if (unique.length >= 5) break;
  }

  if (unique.length < 5) {
    for (const rule of FALLBACK_BY_FABRIC[fabric]) {
      if (unique.length >= 5) break;
      if (isFabricEcho(rule.name, primary.name)) continue;
      if (unique.some((u) => u.name.toLowerCase() === rule.name.toLowerCase())) continue;
      unique.push(rule);
    }
  }

  return unique.map((rule, index) => {
    const rank = index + 1;
    return {
      rank,
      name: rule.name,
      slug: slugify(rule.name),
      hex: blouseHexForName(rule.name),
      matchPercent: scoreFromRule(rule, rank, primary.confidence),
      matchType: rule.matchType,
      reason: rule.reason
    };
  });
}

export function buildColorMatchAnalysis(
  detectedColors: DetectedColor[],
  recommendations: BlouseColorRecommendation[]
): ColorMatchAnalysis {
  return {
    summary: buildAnalysisSummary(detectedColors),
    detectedColors,
    recommendations
  };
}
