import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/navigation/AppHeader";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import { Brand } from "@/constants/brand";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";

export default function ShopScreen() {
  const params = useLocalSearchParams<{ category?: string | string[]; color?: string | string[] }>();
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const color = Array.isArray(params.color) ? params.color[0] : params.color;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <AppHeader />
          <ShopCatalog
            categorySlug={category}
            color={color}
            paddingBottom={BottomTabInset + 24}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
});
