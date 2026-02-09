"use client";

import { useSidebar } from "@/components/providers/SidebarProvider";
import Header from "@/components/dashboard/Header";
import { PageTransition } from "@/components/ui/page-transition";
import { cn } from "@/lib/utils";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface DashboardContentProps {
  children: React.ReactNode;
  user: User;
}

export function DashboardContent({ children, user }: DashboardContentProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        "lg:pl-64",
        isCollapsed && "lg:pl-[72px]",
      )}
    >
      <Header user={user} />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
