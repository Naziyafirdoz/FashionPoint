import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";

import { AppHeader } from "@/components/navigation/AppHeader";
import { PrimaryButton, StatusMessage } from "@/components/ui/form";
import { Brand } from "@/constants/brand";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";
import {
  fetchAccountDashboard,
  type AccountDashboardData,
} from "@/lib/account";
import { toUserMessage } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

const ICON_BG = "#FFF0F3";
const ICON_SIZE = 16;

type AccountIcon = {
  ios: SFSymbol;
  android: AndroidSymbol;
};

const ICONS = {
  orders: { ios: "shippingbox", android: "inventory_2" },
  wishlist: { ios: "heart", android: "favorite" },
  addresses: { ios: "mappin", android: "location_on" },
  measurements: { ios: "ruler", android: "straighten" },
  profile: { ios: "person", android: "person" },
  sparkles: { ios: "sparkles", android: "auto_awesome" },
  chevron: { ios: "chevron.right", android: "chevron_right" },
  check: { ios: "checkmark.circle.fill", android: "check_circle" },
  circle: { ios: "circle", android: "radio_button_unchecked" },
} as const satisfies Record<string, AccountIcon>;

const ACTIONS: Array<{ title: string; href: Href; icon: AccountIcon }> = [
  { title: "My Orders", href: "/orders" as Href, icon: ICONS.orders },
  { title: "Wishlist", href: "/wishlist" as Href, icon: ICONS.wishlist },
  { title: "Edit Profile", href: "/profile" as Href, icon: ICONS.profile },
  { title: "Saved Addresses", href: "/addresses" as Href, icon: ICONS.addresses },
  { title: "Measurements", href: "/measurements" as Href, icon: ICONS.measurements },
  { title: "AI History", href: "/ai-history" as Href, icon: ICONS.sparkles },
];

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [dashboard, setDashboard] = useState<AccountDashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setDashboard(null);
      setDashLoading(false);
      return;
    }
    setDashLoading(true);
    try {
      const data = await fetchAccountDashboard(user);
      setDashboard(data);
      setError(null);
    } catch (err) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[account]", {
          source: "dashboard",
          status: "error",
          error: err instanceof Error ? err.message : "unknown",
        });
      }
      setError(toUserMessage(err, "Unable to load your account."));
    } finally {
      setDashLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setDashboard(null);
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <AppHeader />
          <StatusMessage message="Loading your account…" />
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
            <AppHeader />
            <View style={styles.guestBody}>
              <Text style={styles.title}>Account</Text>
              <Text style={styles.guestCopy}>
                Sign in to view orders, addresses, and saved details.
              </Text>
              <PrimaryButton
                label="Sign in"
                onPress={() => router.push("/login?redirect=/account" as Href)}
              />
              <PrimaryButton
                label="Create account"
                variant="outline"
                onPress={() => router.push("/signup" as Href)}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.frame, { maxWidth: MaxContentWidth }]}>
          <AppHeader />
          {dashLoading && !dashboard ? (
            <ActivityIndicator color={Brand.maroon} style={{ marginTop: 40 }} />
          ) : error && !dashboard ? (
            <StatusMessage
              title="Unable to load account"
              message={error}
              actionLabel="Try again"
              onAction={() => void loadDashboard()}
            />
          ) : dashboard ? (
            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.welcomeCard}>
                <View style={styles.welcomeRow}>
                  <View style={styles.avatar} accessibilityLabel={`${dashboard.displayName} initials`}>
                    <Text style={styles.avatarText}>{dashboard.initials}</Text>
                  </View>
                  <View style={styles.welcomeCopy}>
                    <Text style={styles.welcomeEyebrow}>Welcome back,</Text>
                    <Text style={styles.welcomeName}>{dashboard.displayName}</Text>
                    <Text style={styles.welcomeEmail} numberOfLines={1}>
                      {dashboard.email}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>
                    {dashboard.profile.percent}% Profile Complete
                  </Text>
                  {dashboard.profile.profileComplete ? (
                    <Text style={styles.progressDone}>Done</Text>
                  ) : null}
                </View>
                <View
                  style={styles.progressTrack}
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: dashboard.profile.percent,
                  }}
                >
                  <View
                    style={[styles.progressFill, { width: `${dashboard.profile.percent}%` }]}
                  />
                </View>
                <PrimaryButton
                  label={signingOut ? "Signing out…" : "Sign Out"}
                  variant="outline"
                  disabled={signingOut}
                  onPress={() => void handleSignOut()}
                />
              </View>

              <View style={styles.statsGrid}>
                <StatCard
                  count={String(dashboard.ordersCount)}
                  label="Orders"
                  icon={ICONS.orders}
                  onPress={() => router.push("/orders" as Href)}
                />
                <StatCard
                  count={String(dashboard.wishlistCount)}
                  label="Wishlist"
                  icon={ICONS.wishlist}
                  onPress={() => router.push("/wishlist" as Href)}
                />
                <StatCard
                  count={String(dashboard.addressesCount)}
                  label="Saved Addresses"
                  icon={ICONS.addresses}
                  onPress={() => router.push("/addresses" as Href)}
                />
                <StatCard
                  count={dashboard.profile.measurementsSaved ? "✓" : "—"}
                  label="Measurements"
                  icon={ICONS.measurements}
                  onPress={() => router.push("/measurements" as Href)}
                />
              </View>

              <Text style={styles.sectionTitle}>Quick Actions</Text>
              {ACTIONS.map((action) => (
                <Pressable
                  key={action.title}
                  onPress={() => router.push(action.href)}
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
                >
                  <View style={styles.actionLeft}>
                    <View style={styles.iconWrap}>
                      <AccountGlyph icon={action.icon} />
                    </View>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                  </View>
                  <AccountGlyph icon={ICONS.chevron} color={Brand.maroon} />
                </Pressable>
              ))}

              <Text style={styles.sectionTitle}>Account Status</Text>
              <StatusItem label="Email Verified" complete={dashboard.profile.emailVerified} />
              <StatusItem
                label="Measurements Saved"
                complete={dashboard.profile.measurementsSaved}
                onPress={
                  dashboard.profile.measurementsSaved
                    ? undefined
                    : () => router.push("/measurements" as Href)
                }
              />
              <StatusItem
                label="Address Added"
                complete={dashboard.profile.addressAdded}
                onPress={
                  dashboard.profile.addressAdded
                    ? undefined
                    : () => router.push("/addresses" as Href)
                }
              />
              <StatusItem
                label="Profile Complete"
                complete={dashboard.profile.profileComplete}
                onPress={
                  dashboard.profile.profileComplete
                    ? undefined
                    : () => router.push("/profile" as Href)
                }
              />
            </ScrollView>
          ) : (
            <StatusMessage message="Loading your account…" />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function AccountGlyph({
  icon,
  color = Brand.maroon,
}: {
  icon: AccountIcon;
  color?: string;
}) {
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android }}
      size={ICON_SIZE}
      tintColor={color}
    />
  );
}

function StatCard({
  count,
  label,
  icon,
  onPress,
}: {
  count: string;
  label: string;
  icon: AccountIcon;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${count}`}
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
    >
      <View style={styles.statIconWrap}>
        <AccountGlyph icon={icon} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function StatusItem({
  label,
  complete,
  onPress,
}: {
  label: string;
  complete: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <AccountGlyph
        icon={complete ? ICONS.check : ICONS.circle}
        color={complete ? Brand.discount : Brand.muted}
      />
      <Text style={styles.statusLabel}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.statusItem, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.statusItem}>{content}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.ivory },
  safe: { flex: 1, alignItems: "center" },
  frame: { flex: 1, width: "100%" },
  guestBody: {
    padding: 24,
    gap: 14,
  },
  title: {
    fontFamily: Brand.displayFont,
    fontSize: 28,
    fontWeight: "700",
    color: Brand.maroon,
  },
  guestCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: Brand.muted,
    marginBottom: 8,
  },
  body: { padding: 16, paddingBottom: BottomTabInset + 24, gap: 10 },
  welcomeCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 16,
    gap: 12,
  },
  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.maroon,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: Brand.white, fontSize: 18, fontWeight: "700" },
  welcomeCopy: { flex: 1, minWidth: 0 },
  welcomeEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: Brand.maroon,
    opacity: 0.7,
  },
  welcomeName: {
    fontFamily: Brand.displayFont,
    fontSize: 24,
    fontWeight: "700",
    color: Brand.maroon,
  },
  welcomeEmail: { marginTop: 2, fontSize: 13, color: Brand.muted },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { fontSize: 13, fontWeight: "600", color: Brand.ink },
  progressDone: { fontSize: 13, fontWeight: "700", color: Brand.discount },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: Brand.blushBorder,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Brand.maroon,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    padding: 14,
    minHeight: 96,
    justifyContent: "flex-end",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statCount: {
    fontFamily: Brand.displayFont,
    fontSize: 26,
    fontWeight: "700",
    color: Brand.maroon,
  },
  statLabel: { marginTop: 2, fontSize: 13, color: Brand.muted, fontWeight: "600" },
  sectionTitle: {
    marginTop: 8,
    fontFamily: Brand.displayFont,
    fontSize: 18,
    fontWeight: "700",
    color: Brand.maroon,
  },
  actionRow: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  actionTitle: { fontSize: 14, fontWeight: "700", color: Brand.ink, flexShrink: 1 },
  statusItem: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.blushBorder,
    backgroundColor: Brand.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusLabel: { fontSize: 14, fontWeight: "600", color: Brand.ink },
  error: { color: "#9B1C1C", fontSize: 13 },
  pressed: { opacity: 0.82 },
});
