import { redirect } from "next/navigation";

export const metadata = {
  title: "Riwayat Alert",
  description: "Halaman riwayat alert dinonaktifkan sementara",
};

export default function AlertHistoryPage() {
  redirect("/dashboard");
}
