import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { Brand } from "@/constants/brand";
import { AuthProvider } from "@/providers/AuthProvider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
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
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Brand.ivory },
          }}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}
