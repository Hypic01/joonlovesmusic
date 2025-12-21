import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname === "/admin/login";
  const adminAuth = request.cookies.get("admin-auth")?.value;

  // If accessing admin routes (except login) without auth, redirect to login
  if (isAdminRoute && !isLoginRoute && adminAuth !== "authenticated") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // If accessing login page while already authenticated, redirect to admin
  if (isLoginRoute && adminAuth === "authenticated") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

// Temporarily disable middleware for debugging
// export function middleware() {
//   return NextResponse.next();
// }

