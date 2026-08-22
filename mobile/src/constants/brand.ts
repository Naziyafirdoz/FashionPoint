import { Platform } from "react-native";

export const Brand = {
  name: "Fashion Point",
  tagline: "Style. Confidence. You.",
  maroon: "#7B0D2B",
  maroonDeep: "#5C0A21",
  gold: "#B8860B",
  goldDeep: "#9A7209",
  ivory: "#FFFBF9",
  blush: "#FFF5F7",
  blushBorder: "#F3E5E8",
  muted: "#777777",
  ink: "#2A2A2A",
  white: "#FFFFFF",
  displayFont: Platform.select({ ios: "Georgia", default: "serif" }),
} as const;
