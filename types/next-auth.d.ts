import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

type Role = string;
type SidebarMenu = {
  id: string;
  name: string;
  path: string;
  icon: string;
  selectorValue: string | null;
  order: number;
  parentId: string | null;
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      permissions: string[];
      menus: SidebarMenu[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    permissions?: string[];
    menus?: SidebarMenu[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    permissions?: string[];
    menus?: SidebarMenu[];
  }
}
