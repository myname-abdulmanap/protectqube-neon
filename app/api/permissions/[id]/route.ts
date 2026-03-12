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

// GET /api/permissions/[id] - Get permission by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: "GET",
      headers: getAuthHeader(request),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching permission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch permission" },
      { status: 500 }
    );
  }
}

// PUT /api/permissions/[id] - Update permission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: "PUT",
      headers: getAuthHeader(request),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error updating permission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update permission" },
      { status: 500 }
    );
  }
}

// DELETE /api/permissions/[id] - Delete permission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const response = await fetch(`${API_BASE_URL}/permissions/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(request),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete permission" },
      { status: 500 }
    );
  }
}
