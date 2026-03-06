import { AlertsDashboard } from "../../components/dashboard/AlertsDashboard";

export const metadata = {
  title: "Dashboard",
  description: "Alerts dashboard for monitoring system events",
};

export default function DashboardPage() {
  return (
    <div className="space-y-1">
      <AlertsDashboard />
    </div>
  );
}
