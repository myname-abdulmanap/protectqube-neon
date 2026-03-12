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

    // Prevent recursive proxy calls (e.g. BACKEND_URL points to energy.protectqube.ai/api)
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
 * GET /api/device-metrics
 * Proxy for device metrics endpoints
 */
export async function GET(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl();
    validateProxyTarget(request, API_BASE_URL);
    // Get the search params from the incoming request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    // Forward the request to the backend
    const backendUrl = `${API_BASE_URL}/device-metrics${queryString ? `?${queryString}` : ""}`;
    
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
    console.error("Error proxying device-metrics GET:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch device metrics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/device-metrics
 * Proxy for creating device metrics
 */
export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl();
    validateProxyTarget(request, API_BASE_URL);
    const body = await request.json();
    const backendUrl = `${API_BASE_URL}/device-metrics`;
    
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: getAuthHeader(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error proxying device-metrics POST:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create device metrics" },
      { status: 500 }
    );
  }
}
