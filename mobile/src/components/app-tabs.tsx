import { NativeTabs } from "expo-router/unstable-native-tabs";

import { Brand } from "@/constants/brand";

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Brand.white}
      indicatorColor={Brand.blush}
      tintColor={Brand.maroon}
      iconColor={{ default: Brand.muted, selected: Brand.maroon }}
      labelStyle={{
        default: { color: Brand.muted },
        selected: { color: Brand.maroon },
      }}
    >
      <NativeTabs.Trigger name="index" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="shop" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          md="grid_view"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="wishlist" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>Wishlist</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "heart", selected: "heart.fill" }}
          md="favorite"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
