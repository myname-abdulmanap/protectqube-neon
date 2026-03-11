import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard",
  description: "Energy monitoring overview with outlet map",
};

export default function DashboardPage() {
  redirect("/dashboard/energy-monitoring/overview");
}
