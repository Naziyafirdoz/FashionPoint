import { createServerClient } from "@supabase/ssr";
import {
  mightBeLegacyCategoryPath,
  resolveLegacyCategoryRedirectPath
} from "@/lib/categories/legacy-redirect";
import { NextResponse, type NextRequest } from "next/server";

const CUSTOMER_PROTECTED = ["/account", "/orders"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"];

function isCustomerProtected(pathname: string) {
  return CUSTOMER_PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.includes(pathname);
}

function isAdminPanel(pathname: string) {
  return pathname.startsWith("/admin") && pathname !== "/admin/login";
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (mightBeLegacyCategoryPath(pathname)) {
    const legacyRedirect = await resolveLegacyCategoryRedirectPath(pathname);
    if (legacyRedirect) {
      const redirect = NextResponse.redirect(new URL(legacyRedirect, request.url));
      supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  if (isAuthPage(pathname) && user) {
    const redirect = NextResponse.redirect(new URL("/account/dashboard", request.url));
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (isCustomerProtected(pathname) && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/admin/login") {
    if (user) {
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminRow) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
    return supabaseResponse;
  }

  if (isAdminPanel(pathname)) {
    if (!user) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("redirect", pathname);
      return NextResponse.redirect(login);
    }

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRow) {
      await supabase.auth.signOut();
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("error", "not_admin");
      const redirect = NextResponse.redirect(login);
      supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      return redirect;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    "/account",
    "/account/:path*",
    "/wishlist",
    "/orders",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/admin/:path*",
    "/api/orders",
    "/api/orders/:path*",
    "/api/reviews",
    "/api/reviews/:path*"
  ]
};
