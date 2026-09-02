import Link from "next/link";
import { BrandLogo } from "@/components/store/BrandLogo";
import { STORE_NAME } from "@/lib/site-config";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  storeName?: string;
  logoUrl?: string;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  storeName = STORE_NAME,
  logoUrl
}: AuthLayoutProps) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <BrandLogo href="/" variant="dark" className="mx-auto" storeName={storeName} logoUrl={logoUrl} />
        <h1 className="mt-6 font-display text-2xl font-bold text-primary">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-foreground/70">{subtitle}</p> : null}
      </div>
      <div className="card-store">{children}</div>
      {footer ? <div className="mt-6 text-center text-sm text-foreground/70">{footer}</div> : null}
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}

export function AuthSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
      {message}
    </p>
  );
}

export function authInputClassName() {
  return "mt-1 w-full rounded-xl border border-accent/30 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
}

export function authLabelClassName() {
  return "block text-sm font-medium text-foreground/80";
}
