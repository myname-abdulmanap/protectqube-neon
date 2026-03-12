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

// DELETE /api/roles/[id]/permissions/[permissionId] - Revoke permission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; permissionId: string }> }
) {
  const { id, permissionId } = await params;
  try {
    const response = await fetch(
      `${API_BASE_URL}/roles/${id}/permissions/${permissionId}`,
      {
        method: "DELETE",
        headers: getAuthHeader(request),
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error revoking permission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke permission" },
      { status: 500 }
    );
  }
}
