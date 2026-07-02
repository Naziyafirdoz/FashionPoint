import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { DashboardProfileStatus } from "@/lib/account/dashboard-profile";

type StatusItem = {
  label: string;
  complete: boolean;
  href?: string;
};

type DashboardAccountStatusProps = {
  profile: DashboardProfileStatus;
};

export function DashboardAccountStatus({ profile }: DashboardAccountStatusProps) {
  const items: StatusItem[] = [
    { label: "Email Verified", complete: profile.emailVerified },
    { label: "Measurements Saved", complete: profile.measurementsSaved, href: "/account/measurements" },
    { label: "Address Added", complete: profile.addressAdded, href: "/account/addresses" },
    { label: "Profile Complete", complete: profile.profileComplete, href: "/account/profile" }
  ];

  const cardClassName =
    "flex h-full min-h-[52px] items-center gap-2.5 rounded-[16px] border border-[#F3E5E8] bg-white px-4 py-3 shadow-[0_2px_10px_rgba(122,13,43,0.03)] transition hover:border-primary/10";

  return (
    <section aria-labelledby="dashboard-status-heading">
      <h2 id="dashboard-status-heading" className="mb-3 font-display text-lg font-bold text-primary">
        Account Status
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const content = (
            <>
              {item.complete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-foreground/30" aria-hidden="true" />
              )}
              <span className="text-sm font-medium text-[#2A2A2A]">{item.label}</span>
            </>
          );

          if (!item.complete && item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`${cardClassName} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={item.label} className={cardClassName}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
