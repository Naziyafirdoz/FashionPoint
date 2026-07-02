import { DashboardWelcomeHeader } from "@/components/account/dashboard/DashboardWelcomeHeader";
import { DashboardQuickStats } from "@/components/account/dashboard/DashboardQuickStats";
import { DashboardQuickActions } from "@/components/account/dashboard/DashboardQuickActions";
import { DashboardAccountStatus } from "@/components/account/dashboard/DashboardAccountStatus";
import type { DashboardData } from "@/components/account/dashboard/dashboard-types";

export function DashboardShell({
  displayName,
  email,
  avatarUrl,
  initials,
  profile,
  ordersCount,
  wishlistCount,
  addressesCount
}: DashboardData) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-5">
        <DashboardWelcomeHeader
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          initials={initials}
          profile={profile}
        />

        <DashboardQuickStats
          ordersCount={ordersCount}
          wishlistCount={wishlistCount}
          addressesCount={addressesCount}
          measurementsComplete={profile.measurementsSaved}
        />

        <DashboardQuickActions />

        <DashboardAccountStatus profile={profile} />
      </div>
    </div>
  );
}
