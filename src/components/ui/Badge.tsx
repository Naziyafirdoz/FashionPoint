import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
  variant = "soft"
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "soft" | "danger" | "gold";
}) {
  const v =
    variant === "danger"
      ? "bg-maroon text-white"
      : variant === "gold"
        ? "bg-lightGold/70 text-maroon border border-lightGold/70"
        : "bg-blush-100 text-maroon border border-blush-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        v,
        className
      )}
    >
      {children}
    </span>
  );
}

