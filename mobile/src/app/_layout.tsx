import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";

import { Brand } from "@/constants/brand";
import { AuthProvider } from "@/providers/AuthProvider";
import { CartProvider } from "@/providers/CartProvider";
import { WishlistProvider } from "@/providers/WishlistProvider";

SplashScreen.preventAutoHideAsync();

const SPLASH_HOLD_MS = 60_000;
const SPLASH_LOGO = require("@/assets/brand/fashion-point-logo.png");
const SPLASH_LOGO_ASPECT = 132 / 92;

function BrandSplashOverlay() {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const logoWidth = Math.round(width * 0.3);

  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().finally(() => {
        setVisible(false);
      });
    }, SPLASH_HOLD_MS);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={splashStyles.overlay} pointerEvents="auto" accessibilityLabel="Fashion Point">
      <Image
        source={SPLASH_LOGO}
        style={{ width: logoWidth, height: Math.round(logoWidth * SPLASH_LOGO_ASPECT) }}
        contentFit="contain"
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
      <WishlistProvider>
      <ThemeProvider
        value={{
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: Brand.ivory,
            card: Brand.white,
            primary: Brand.maroon,
            text: Brand.ink,
            border: Brand.blushBorder,
          },
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Brand.ivory },
          }}
        />
        <BrandSplashOverlay />
      </ThemeProvider>
      </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Brand.ivory,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    elevation: 1000,
  },
});
