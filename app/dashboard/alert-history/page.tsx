import { AlertHistory } from "@/components/dashboard/AlertHistory";

export const metadata = {
  title: "Riwayat Alert",
  description: "Lihat riwayat alert yang sudah ditangani",
};

export default function AlertHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Riwayat Alert</h1>
        <p className="text-muted-foreground mt-1">
          Daftar alert yang sudah ditangani (Under Review, Resolved, dll)
        </p>
      </div>
      <AlertHistory />
    </div>
  );
}
