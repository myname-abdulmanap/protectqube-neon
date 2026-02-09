import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { SidebarProvider } from "@/components/providers/SidebarProvider";
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
      <div className="min-h-screen bg-background">
        <Sidebar user={session.user} />
        <DashboardContent user={session.user}>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
