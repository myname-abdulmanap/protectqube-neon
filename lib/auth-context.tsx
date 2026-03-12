"use client";

import React, { useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permissionName: string) => boolean;
}

// Kept for backward compatibility – no longer holds state of its own.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): AuthContextType {
  const { data: session, status, update } = useSession();
  const isLoading = status === "loading";

  // Build a shape compatible with the existing User interface
  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || "",
        email: session.user.email || "",
        roleId: "",
        isActive: true,
        createdAt: "",
        updatedAt: "",
        role: {
          id: "",
          name: session.user.role,
          description: null,
          createdAt: "",
          updatedAt: "",
          permissions: (session.user.permissions || []).map((name) => ({
            id: name,
            name,
            description: null,
            resource: null,
            action: null,
            createdAt: "",
            updatedAt: "",
          })),
        },
        menus: (session.user.menus || []).map((m) => ({
          ...m,
          createdAt: "",
          updatedAt: "",
        })),
      }
    : null;

  const token = session?.user?.backendToken ?? null;

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          return { success: false, error: "Email atau password salah" };
        }
        return { success: true };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Login gagal";
        return { success: false, error: message };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    signOut({ callbackUrl: "/login" });
  }, []);

  const refreshUser = useCallback(async () => {
    await update();
  }, [update]);

  const hasPermission = useCallback(
    (permissionName: string): boolean => {
      return (session?.user?.permissions || []).includes(permissionName);
    },
    [session],
  );

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!session,
    login,
    logout,
    refreshUser,
    hasPermission,
  };
}

// HOC for protected routes (kept for backward compatibility)
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: string,
) {
  return function ProtectedRoute(props: P) {
    const { isAuthenticated, isLoading, hasPermission } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-gray-600 mt-2">
              You don&apos;t have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Required permission: {requiredPermission}
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
