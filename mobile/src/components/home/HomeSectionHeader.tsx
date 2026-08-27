import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Brand } from "@/constants/brand";

const DIVIDER = require("@/assets/home/explore-collections-divider.png");

type HomeSectionHeaderProps = {
  title: string;
  subtitle?: string;
  dividerFirst?: boolean;
};

export function HomeSectionHeader({
  title,
  subtitle,
  dividerFirst = false,
}: HomeSectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      {dividerFirst ? <Image source={DIVIDER} style={styles.divider} contentFit="contain" /> : null}
      <Text style={styles.title}>{title}</Text>
      {dividerFirst ? null : (
        <Image source={DIVIDER} style={styles.divider} contentFit="contain" />
      )}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: Brand.displayFont,
    fontSize: 28,
    fontWeight: "700",
    color: Brand.maroon,
    textAlign: "center",
    lineHeight: 34,
  },
  divider: {
    width: 180,
    height: 22,
    marginVertical: 6,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(42,42,42,0.55)",
    textAlign: "center",
    maxWidth: 340,
  },
});
