import type { DashboardProfileStatus } from "@/lib/account/dashboard-profile";

export type DashboardData = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  profile: DashboardProfileStatus;
  ordersCount: number;
  wishlistCount: number;
  addressesCount: number;
};
