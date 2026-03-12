import { NextRequest, NextResponse } from "next/server";

function getApiBaseUrl(): string {
  const serverUrl = process.env.BACKEND_URL;
  const publicUrl = process.env.NEXT_PUBLIC_API_URL;

  if (serverUrl) return serverUrl;
  if (publicUrl) return publicUrl;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing BACKEND_URL (or NEXT_PUBLIC_API_URL) in production environment");
  }

  return "http://localhost:4000/api";
}

function validateProxyTarget(request: NextRequest, baseUrl: string): void {
  try {
    const target = new URL(baseUrl);
    const incoming = request.nextUrl;

    if (target.host === incoming.host && target.pathname.startsWith("/api")) {
      throw new Error(
        `Invalid proxy target: ${baseUrl}. BACKEND_URL must point to backend server, not this Next.js domain.`
      );
    }
  } catch {
    // Ignore URL parse validation for non-absolute URLs.
  }
}

function getAuthHeader(request: NextRequest): HeadersInit {
  const authHeader = request.headers.get("authorization");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }
  return headers;
}

/**
 * GET /api/energy-dashboard
 * Proxy for energy dashboard endpoints
 */
export async function GET(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl();
    validateProxyTarget(request, API_BASE_URL);
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    const backendUrl = `${API_BASE_URL}/energy-dashboard${queryString ? `?${queryString}` : ""}`;
    
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: getAuthHeader(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Backend error" }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error proxying energy-dashboard:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch energy dashboard data" },
      { status: 500 }
    );
  }
}
