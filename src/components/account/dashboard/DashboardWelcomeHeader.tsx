import Image from "next/image";
import { SignOutButton } from "@/components/auth/SignOutButton";
import type { DashboardProfileStatus } from "@/lib/account/dashboard-profile";

type DashboardWelcomeHeaderProps = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
  profile: DashboardProfileStatus;
};

export function DashboardWelcomeHeader({
  displayName,
  email,
  avatarUrl,
  initials,
  profile
}: DashboardWelcomeHeaderProps) {
  return (
    <header className="rounded-[20px] border border-[#F3E5E8] bg-white p-5 shadow-[0_4px_20px_rgba(122,13,43,0.05)] sm:p-6">
      <div className="grid gap-5 md:grid-cols-2 md:items-center md:gap-8">
        <div className="flex items-center gap-4">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[#9a1535] text-lg font-semibold text-white shadow-[0_4px_14px_rgba(123,13,43,0.18)]"
            aria-hidden={Boolean(avatarUrl)}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <span aria-label={`${displayName} initials`}>{initials}</span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary/70">Welcome back,</p>
            <h1 className="font-display text-2xl font-bold text-primary sm:text-[1.75rem]">{displayName}</h1>
            <p className="mt-0.5 truncate text-sm text-foreground/65">{email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:items-end md:justify-center">
          <div className="w-full md:max-w-xs">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-foreground/75">{profile.percent}% Profile Complete</span>
              {profile.profileComplete ? (
                <span className="font-semibold text-emerald-600">Done</span>
              ) : null}
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3E5E8]"
              role="progressbar"
              aria-valuenow={profile.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completion"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${profile.percent}%` }}
              />
            </div>
          </div>
          <SignOutButton className="inline-flex h-10 w-full items-center justify-center rounded-full border border-primary/25 bg-white px-5 text-sm font-medium text-primary transition hover:border-primary hover:bg-[#FFF5F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:w-auto md:min-w-[140px]" />
        </div>
      </div>
    </header>
  );
}
