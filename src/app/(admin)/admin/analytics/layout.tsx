import { StoreAnalyticsProvider } from "@/components/admin/analytics/store-analytics-context";

export default function AdminAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <StoreAnalyticsProvider>{children}</StoreAnalyticsProvider>;
}
