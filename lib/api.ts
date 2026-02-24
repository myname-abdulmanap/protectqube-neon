import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

// API Base URL - should be configured via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Token storage key
const TOKEN_KEY = "auth_token";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - auto attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (only in browser)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        // Redirect to login page
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Token management utilities
export const authToken = {
  set: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      // Also set as cookie for middleware to read
      document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
  },
  get: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },
  remove: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      // Also remove cookie
      document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  },
};

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role?: Role;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string | null;
  action: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>("/auth/login", {
      email,
      password,
    });
    // Auto-save token on successful login
    if (response.data.success && response.data.data?.token) {
      authToken.set(response.data.data.token);
    }
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>("/auth/me");
    return response.data;
  },

  logout: () => {
    authToken.remove();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get<ApiResponse<User[]>>("/users");
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  },

  create: async (data: {
    email: string;
    password: string;
    name: string;
    roleId: string;
  }): Promise<ApiResponse<User>> => {
    const response = await apiClient.post<ApiResponse<User>>("/users", data);
    return response.data;
  },

  update: async (
    id: string,
    data: {
      email?: string;
      password?: string;
      name?: string;
      roleId?: string;
      isActive?: boolean;
    }
  ): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/users/${id}`);
    return response.data;
  },
};

// Roles API
export const rolesApi = {
  getAll: async (): Promise<ApiResponse<Role[]>> => {
    const response = await apiClient.get<ApiResponse<Role[]>>("/roles");
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Role>> => {
    const response = await apiClient.get<ApiResponse<Role>>(`/roles/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
  }): Promise<ApiResponse<Role>> => {
    const response = await apiClient.post<ApiResponse<Role>>("/roles", data);
    return response.data;
  },

  update: async (
    id: string,
    data: { name?: string; description?: string }
  ): Promise<ApiResponse<Role>> => {
    const response = await apiClient.put<ApiResponse<Role>>(`/roles/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/roles/${id}`);
    return response.data;
  },

  assignPermission: async (
    roleId: string,
    permissionId: string
  ): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(
      `/roles/${roleId}/permissions`,
      { permissionId }
    );
    return response.data;
  },

  revokePermission: async (
    roleId: string,
    permissionId: string
  ): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/roles/${roleId}/permissions/${permissionId}`
    );
    return response.data;
  },
};

// Permissions API
export const permissionsApi = {
  getAll: async (): Promise<ApiResponse<Permission[]>> => {
    const response = await apiClient.get<ApiResponse<Permission[]>>("/permissions");
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Permission>> => {
    const response = await apiClient.get<ApiResponse<Permission>>(`/permissions/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    resource?: string;
    action?: string;
  }): Promise<ApiResponse<Permission>> => {
    const response = await apiClient.post<ApiResponse<Permission>>("/permissions", data);
    return response.data;
  },

  update: async (
    id: string,
    data: {
      name?: string;
      description?: string;
      resource?: string;
      action?: string;
    }
  ): Promise<ApiResponse<Permission>> => {
    const response = await apiClient.put<ApiResponse<Permission>>(
      `/permissions/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/permissions/${id}`);
    return response.data;
  },
};

// Admin-only route example
export const adminApi = {
  checkAdminAccess: async (): Promise<ApiResponse<{ message: string; user: unknown }>> => {
    const response = await apiClient.get<ApiResponse<{ message: string; user: unknown }>>(
      "/admin-only"
    );
    return response.data;
  },
};

export default apiClient;
