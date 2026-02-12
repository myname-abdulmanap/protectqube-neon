"use client";

import { useSidebar } from "@/components/providers/SidebarProvider";
import { useHeaderSelector } from "@/components/providers/HeaderSelectorProvider";
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
  const { value, setValue } = useHeaderSelector();

  return (
    <div
      className={cn(
        "flex flex-col min-h-screen transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        "lg:pl-[180px]",
        isCollapsed && "lg:pl-11",
      )}
    >
      <Header user={user} selectorValue={value} onSelectorChange={setValue} />
      <main className="flex-1 p-1 md:p-1.5">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
