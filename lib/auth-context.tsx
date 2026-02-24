"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi, authToken, User } from "@/lib/api";

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permissionName: string): boolean => {
      if (!user?.role?.permissions) return false;
      return user.role.permissions.some((p) => p.name === permissionName);
    },
    [user],
  );

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    try {
      const storedToken = authToken.get();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      const response = await authApi.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        setToken(null);
        authToken.remove();
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
      setToken(null);
      authToken.remove();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsLoading(true);
        const response = await authApi.login(email, password);

        if (response.success && response.data) {
          setUser(response.data.user);
          setToken(response.data.token);
          return { success: true };
        } else {
          return { success: false, error: response.error || "Login failed" };
        }
      } catch (error: any) {
        console.error("Auth context login error:", error);

        // Handle network errors
        if (
          error?.code === "ERR_NETWORK" ||
          error?.message?.includes("Network Error")
        ) {
          return {
            success: false,
            error:
              "Tidak dapat terhubung ke server. Pastikan backend berjalan di http://localhost:3001",
          };
        }

        // Handle connection refused
        if (error?.code === "ECONNREFUSED") {
          return {
            success: false,
            error: "Koneksi ditolak. Backend tidak berjalan.",
          };
        }

        const errorMessage =
          error?.response?.data?.error || error?.message || "Login failed";
        return { success: false, error: errorMessage };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    authApi.logout();
  }, []);

  // Check authentication on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// HOC for protected routes
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
              You don't have permission to access this page.
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
