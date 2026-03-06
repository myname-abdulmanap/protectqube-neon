import { AlertsDashboard } from "@/components/dashboard/AlertsDashboard";

export const metadata = {
  title: "Alerts Dashboard",
  description: "Monitor and manage system alerts in real-time",
};

export default function AlertsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage system alerts in real-time
        </p>
      </div>
      <AlertsDashboard />
    </div>
  );
}
