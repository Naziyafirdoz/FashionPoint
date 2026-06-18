import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-accent/30 bg-blush/20 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-card">
        <Icon className="h-5 w-5 text-primary/60" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-foreground/50">{description}</p>}
    </div>
  );
}
