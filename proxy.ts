import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/app/_lib/auth";

// Paths that never require authentication
const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/upload",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and uploaded images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // Root "/" — the animated splash + login page.
  // If already authenticated → go straight to the dashboard.
  if (pathname === "/") {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const session = await verifyToken(token);
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Everything else requires authentication.
  // Unauthenticated users are sent back to the splash page.
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
