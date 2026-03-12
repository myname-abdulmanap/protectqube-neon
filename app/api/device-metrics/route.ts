import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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
