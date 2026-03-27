import { AlertsDashboard } from "@/components/dashboard/AlertsDashboard";

export const metadata = {
  title: "Alert",
  description: "Compact alert dashboard with card-based monitoring",
};

export default function AlertsDashboardPage() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Alert</h1>
          <p className="text-sm text-muted-foreground">
            Monitor active alerts in a compact card layout.
          </p>
        </div>
      </div>

      <AlertsDashboard />
    </div>
  );
}
