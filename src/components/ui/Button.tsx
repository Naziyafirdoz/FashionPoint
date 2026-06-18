import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  href,
  type = "button",
  disabled,
  onClick
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-full font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-roseGold/40 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-sm",
    lg: "h-12 px-7 text-base"
  }[size];
  const variants = {
    primary:
      "bg-maroon text-white shadow-soft hover:bg-maroon/90 luxury-ring",
    ghost: "bg-white/40 hover:bg-white/70 border border-blush-200",
    outline:
      "bg-transparent border border-maroon/30 text-maroon hover:bg-maroon/5"
  }[variant];

  const cls = cn(base, sizes, variants, className);

  if (href) {
    return (
      <Link aria-disabled={disabled} className={cls} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

