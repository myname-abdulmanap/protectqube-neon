import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip proxy for these paths to avoid redirect loops
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }
  
  // Get the NextAuth token
  const nextAuthToken = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET 
  });
  
  // Use NextAuth token as the single source of truth.
  const isLoggedIn = !!nextAuthToken;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

  const isProtectedRoute = pathname.startsWith("/dashboard");

  // If on auth page and already logged in, redirect to dashboard
  if (isAuthPage && nextAuthToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If trying to access protected route without being logged in
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
  ],
};
