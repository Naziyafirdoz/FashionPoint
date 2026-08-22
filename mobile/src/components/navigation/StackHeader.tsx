import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { Brand } from "@/constants/brand";

type StackHeaderProps = {
  title: string;
};

export function StackHeader({ title }: StackHeaderProps) {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      >
        <SymbolView
          name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
          size={22}
          tintColor={Brand.maroon}
        />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.iconButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Brand.ivory,
    borderBottomWidth: 1,
    borderBottomColor: Brand.blushBorder,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: Brand.displayFont,
    fontSize: 20,
    fontWeight: "700",
    color: Brand.maroon,
  },
});
