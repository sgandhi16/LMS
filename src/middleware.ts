import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"];
const ADMIN_ROUTES = ["/admin", "/api/admin"];

export default auth((req: NextRequest & { auth?: { user?: { role?: string } } | null }) => {
  const { nextUrl, auth: session } = req as NextRequest & {
    auth: { user?: { role?: string } } | null;
  };
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  // Allow public routes always
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    // Redirect authenticated users away from login/register
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(
        new URL(role === "ADMIN" ? "/admin" : "/dashboard", nextUrl)
      );
    }
    return NextResponse.next();
  }

  // Require authentication for all protected routes
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ADMIN only routes — reject non-admins
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(role === "ADMIN" ? "/admin" : "/dashboard", nextUrl)
    );
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|fonts).*)"],
};
