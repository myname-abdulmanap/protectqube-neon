import { NextRequest, NextResponse } from "next/server";

/**
 * Generic fallback proxy for any unmapped API endpoints
 * Catches: /api/[...path] where [path] doesn't have dedicated route
 * 
 * This ensures all backend API calls go through the proxy,
 * preventing CORS issues when calling from the browser
 */

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
 * GET /api/[...path]
 * Catches any GET requests to unmapped API endpoints
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = path ? path.join("/") : "";
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    const backendUrl = `${API_BASE_URL}/${pathString}${queryString ? `?${queryString}` : ""}`;

    if (process.env.NODE_ENV === "development") {
      console.log(`[API Proxy] GET ${pathString}${queryString ? `?${queryString}` : ""}`);
    }

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
    console.error("[API Proxy Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Proxy request failed",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/[...path]
 * Catches any POST requests to unmapped API endpoints
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = path ? path.join("/") : "";

    let body: any = null;
    try {
      body = await request.json();
    } catch {
      // Body might be empty for some endpoints
    }

    const backendUrl = `${API_BASE_URL}/${pathString}`;

    if (process.env.NODE_ENV === "development") {
      console.log(`[API Proxy] POST ${pathString}`);
    }

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: getAuthHeader(request),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API Proxy Error]", error);
    return NextResponse.json(
      { success: false, error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/[...path]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = path ? path.join("/") : "";
    const body = await request.json();

    const backendUrl = `${API_BASE_URL}/${pathString}`;

    const response = await fetch(backendUrl, {
      method: "PUT",
      headers: getAuthHeader(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API Proxy Error]", error);
    return NextResponse.json(
      { success: false, error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/[...path]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = path ? path.join("/") : "";

    const backendUrl = `${API_BASE_URL}/${pathString}`;

    const response = await fetch(backendUrl, {
      method: "DELETE",
      headers: getAuthHeader(request),
    });

    // DELETE might not return JSON
    if (response.headers.get("content-length") === "0") {
      return NextResponse.json(
        { success: true },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API Proxy Error]", error);
    return NextResponse.json(
      { success: false, error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/[...path]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathString = path ? path.join("/") : "";
    const body = await request.json();

    const backendUrl = `${API_BASE_URL}/${pathString}`;

    const response = await fetch(backendUrl, {
      method: "PATCH",
      headers: getAuthHeader(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API Proxy Error]", error);
    return NextResponse.json(
      { success: false, error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/[...path]
 * Handle CORS preflight requests
 */
export async function OPTIONS(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return NextResponse.json(
    { success: true },
    {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}
