import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function clearStaleAuthCookies(response: NextResponse) {
  const cookieNames = [
    "auth_token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.csrf-token",
    "authjs.csrf-token",
  ];

  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      path: "/",
      expires: new Date(0),
    });
  }
}

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
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const nextAuthToken = await getToken({ 
    req: request, 
    secret: authSecret 
  });
  
  // Use NextAuth token as the single source of truth.
  const isLoggedIn = !!nextAuthToken;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register";

  const isProtectedRoute = pathname.startsWith("/dashboard");

  // IMPORTANT:
  // Do not auto-redirect /login -> /dashboard here.
  // During backend/front-end restarts or env changes, stale JWT cookies can
  // exist while server session resolution temporarily fails. Auto-redirecting
  // auth pages in that state causes /login <-> /dashboard loops.
  if (isAuthPage) {
    return NextResponse.next();
  }

  // If trying to access protected route without being logged in
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    // Auto-clean stale cookies so users can recover without manual cookie delete.
    clearStaleAuthCookies(response);
    return response;
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
