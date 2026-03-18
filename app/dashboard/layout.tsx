import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { SidebarProvider } from "@/components/providers/SidebarProvider";
import { HeaderSelectorProvider } from "@/components/providers/HeaderSelectorProvider";
import { HeaderPageProvider } from "@/components/providers/HeaderPageProvider";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <HeaderSelectorProvider>
        <HeaderPageProvider>
          <div className="min-h-screen bg-background">
            <Sidebar user={session.user} />
            <DashboardContent user={session.user}>{children}</DashboardContent>
          </div>
        </HeaderPageProvider>
      </HeaderSelectorProvider>
    </SidebarProvider>
  );
}
