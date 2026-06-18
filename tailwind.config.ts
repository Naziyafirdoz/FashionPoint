import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7B0D2B",
        secondary: "#B8860B",
        background: "#FFF5F7",
        foreground: "#1A1A1A",
        accent: "#FF6B9D",
        maroon: "#7B0D2B",
        gold: "#B8860B",
        brand: {
          maroon: "#7B0D2B",
          "maroon-light": "#9A1535",
          gold: "#B8860B",
          "gold-light": "#D4A820",
          blush: "#FDF5F8",
          "blush-dark": "#F0D8E4",
          cream: "#FDF8F0"
        },
        blush: {
          DEFAULT: "#FFF5F7",
          50: "#fff5f8",
          100: "#ffe7ef",
          200: "#ffd0df",
          300: "#ffb0ca"
        },
        roseGold: "#B8860B",
        lightGold: "#E7D7A0",
        cream: "#FFF7EC"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 4px 24px rgba(123, 13, 43, 0.08)",
        soft: "0 18px 60px rgba(26, 26, 26, 0.1)"
      },
      borderRadius: {
        pill: "9999px"
      }
    }
  },
  plugins: []
};

export default config;
