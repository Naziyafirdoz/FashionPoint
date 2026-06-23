"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStoreAnalytics } from "@/components/admin/analytics/use-store-analytics";

type StoreAnalyticsContextValue = ReturnType<typeof useStoreAnalytics>;

const StoreAnalyticsContext = createContext<StoreAnalyticsContextValue | null>(null);

export function StoreAnalyticsProvider({ children }: { children: ReactNode }) {
  const value = useStoreAnalytics();
  return (
    <StoreAnalyticsContext.Provider value={value}>{children}</StoreAnalyticsContext.Provider>
  );
}

export function useStoreAnalyticsContext() {
  const context = useContext(StoreAnalyticsContext);
  if (!context) {
    throw new Error("useStoreAnalyticsContext must be used within StoreAnalyticsProvider");
  }
  return context;
}
