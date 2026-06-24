import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SettingsSection({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="card-store max-w-2xl">
      <h2 className="flex items-center gap-2 font-semibold text-primary">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsFieldList({ children }: { children: ReactNode }) {
  return <dl className="space-y-2 text-sm">{children}</dl>;
}

export function SettingsField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-foreground/60">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function SettingsStatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        connected ? "bg-emerald-100 text-emerald-800" : "bg-foreground/10 text-foreground/60"
      }`}
    >
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}
