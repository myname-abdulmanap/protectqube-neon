import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the token
  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET 
  });
  
  const isLoggedIn = !!token;

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  const isProtectedRoute = pathname.startsWith("/dashboard");

  // If on auth page and already logged in, redirect to dashboard
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If trying to access protected route without being logged in
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
