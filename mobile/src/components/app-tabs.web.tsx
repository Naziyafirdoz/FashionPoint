import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from "expo-router/ui";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import { Pressable, View, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand } from "@/constants/brand";
import { MaxContentWidth } from "@/constants/theme";

type TabIconName = {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton
              icon={{ ios: "house.fill", android: "home", web: "home" }}
            >
              Home
            </TabButton>
          </TabTrigger>
          <TabTrigger name="shop" href="/shop" asChild>
            <TabButton
              icon={{ ios: "square.grid.2x2.fill", android: "grid_view", web: "grid_view" }}
            >
              Shop
            </TabButton>
          </TabTrigger>
          <TabTrigger name="wishlist" href="/wishlist" asChild>
            <TabButton
              icon={{ ios: "heart.fill", android: "favorite", web: "favorite" }}
            >
              Wishlist
            </TabButton>
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton
              icon={{ ios: "person.fill", android: "person", web: "person" }}
            >
              Account
            </TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon: TabIconName }) {
  const color = isFocused ? Brand.maroon : Brand.muted;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
    >
      <SymbolView name={icon} size={22} tintColor={color} />
      <Text style={[styles.tabLabel, { color }]}>{children}</Text>
      <View
        style={[
          styles.activeMark,
          { backgroundColor: isFocused ? Brand.gold : "transparent" },
        ]}
      />
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.tabList,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabList: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: MaxContentWidth,
    flexDirection: "row",
    alignItems: "stretch",
  },
  tabButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  activeMark: {
    marginTop: 4,
    height: 3,
    width: 18,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.7,
  },
});
