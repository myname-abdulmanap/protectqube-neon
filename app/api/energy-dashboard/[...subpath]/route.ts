import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subpath: string[] }> }
) {
  try {
    const { subpath } = await params;
    const subpathString = subpath.join("/");
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    const backendUrl = `${API_BASE_URL}/energy-dashboard/${subpathString}${queryString ? `?${queryString}` : ""}`;

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
    console.error("Error proxying energy-dashboard sub-path:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Proxy request failed" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subpath: string[] }> }
) {
  try {
    const { subpath } = await params;
    const subpathString = subpath.join("/");

    let body: any = null;
    try { body = await request.json(); } catch {}

    const backendUrl = `${API_BASE_URL}/energy-dashboard/${subpathString}`;

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: getAuthHeader(request),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error proxying energy-dashboard sub-path:", error);
    return NextResponse.json(
      { success: false, error: "Proxy request failed" },
      { status: 500 }
    );
  }
}
