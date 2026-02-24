import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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

// GET /api/roles/[id]/permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const response = await fetch(`${API_BASE_URL}/roles/${id}/permissions`, {
      headers: getAuthHeader(request),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch role permissions" },
      { status: 500 }
    );
  }
}

// POST /api/roles/[id]/permissions - Assign permission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/roles/${id}/permissions`, {
      method: "POST",
      headers: getAuthHeader(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error assigning permission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to assign permission" },
      { status: 500 }
    );
  }
}
