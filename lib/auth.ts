import NextAuth, { type NextAuthConfig, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

// API Base URL
const API_BASE_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type BackendPermission = {
  name: string;
};

type BackendMenu = {
  id: string;
  name: string;
  path: string;
  icon: string;
  selectorValue: string | null;
  order: number;
  parentId: string | null;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        const parsed = loginSchema.safeParse(credentials);
        
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        try {
          // Call backend API for authentication
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            console.error("Backend auth failed:", data.error);
            return null;
          }

          const userData = data.data.user;

          return {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role?.name || "user",
            scopeIds: userData.scopeIds || [],
            permissions:
              userData.role?.permissions?.map(
                (permission: BackendPermission) => permission.name,
              ) || [],
            menus:
              userData.menus?.map((menu: BackendMenu) => ({
                id: menu.id,
                name: menu.name,
                path: menu.path,
                icon: menu.icon,
                selectorValue: menu.selectorValue,
                order: menu.order,
                parentId: menu.parentId,
              })) || [],
            backendToken: data.data.token,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && user.id) {
        token.id = user.id;
        token.role = user.role;
        token.scopeIds = user.scopeIds || [];
        token.permissions = user.permissions || [];
        token.menus = user.menus || [];
        token.backendToken = user.backendToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.scopeIds = token.scopeIds || [];
        session.user.permissions = token.permissions || [];
        session.user.menus = token.menus || [];
        session.user.backendToken = token.backendToken ?? "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
