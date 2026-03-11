import { redirect } from "next/navigation";

export const metadata = {
  title: "Alerts Dashboard",
  description: "Halaman alerts dinonaktifkan sementara",
};

export default function AlertsDashboardPage() {
  redirect("/dashboard");
}
