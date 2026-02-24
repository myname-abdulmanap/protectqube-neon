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
  
  // Check for our custom JWT token in cookies (set by client)
  const customToken = request.cookies.get("auth_token")?.value;
  
  // User is logged in if either token exists
  const isLoggedIn = !!nextAuthToken || !!customToken;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

  const isProtectedRoute = pathname.startsWith("/dashboard");

  // If on auth page and already logged in with NextAuth, redirect to dashboard
  // Only check NextAuth token to avoid issues with custom token
  if (isAuthPage && nextAuthToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If trying to access protected route without being logged in
  // Only redirect if both tokens are missing
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
