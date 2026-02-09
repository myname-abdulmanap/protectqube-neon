import { auth } from "@/lib/auth";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EnergyChart } from "@/components/dashboard/EnergyChart";

export default async function DashboardPage() {
  const session = await auth();
  const userRole = session?.user?.role || "VIEWER";

  // Mock data - dalam produksi akan dari database
  const stats = [
    {
      title: "Total Konsumsi",
      value: "2,456",
      unit: "kWh",
      change: "+12.5%",
      trend: "up",
      icon: Zap,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Biaya Bulan Ini",
      value: "3.2",
      unit: "Juta",
      change: "+8.2%",
      trend: "up",
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      title: "Efisiensi",
      value: "87.3",
      unit: "%",
      change: "-2.1%",
      trend: "down",
      icon: Activity,
      gradient: "from-amber-500 to-orange-500",
    },
    {
      title: "Perangkat Aktif",
      value: "24",
      unit: "/28",
      change: "4 offline",
      trend: "warning",
      icon: CheckCircle,
      gradient: "from-violet-500 to-purple-500",
    },
  ];

  const recentAlerts = [
    {
      id: 1,
      message: "Konsumsi listrik melebihi batas normal di Gedung A",
      time: "5 menit lalu",
      type: "warning",
    },
    {
      id: 2,
      message: "Sensor #12 tidak merespons",
      time: "15 menit lalu",
      type: "error",
    },
    {
      id: 3,
      message: "Maintenance terjadwal untuk Panel Utama B",
      time: "1 jam lalu",
      type: "info",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight">
            Selamat Datang, {session?.user?.name?.split(" ")[0] || "User"}! 👋
          </h1>
          <p className="mt-2 text-blue-100 max-w-xl">
            Berikut adalah ringkasan monitoring energi Anda hari ini. Pantau
            konsumsi dan optimalkan penggunaan listrik.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Sistem Online
            </span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm">
              Role: {userRole}
            </span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm">
              Update: Hari ini, 14:30
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className={cn(
                "relative overflow-hidden border-0 shadow-lg bg-gradient-to-br text-white",
                stat.gradient,
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white",
                    )}
                  >
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : stat.trend === "down" ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-white/80">{stat.title}</p>
                  <p className="text-3xl font-bold tracking-tight mt-1">
                    {stat.value}
                    <span className="text-lg font-normal text-white/70 ml-1">
                      {stat.unit}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart placeholder */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Konsumsi Energi (7 Hari Terakhir)
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              Lihat Detail
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <EnergyChart />
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Notifikasi Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "p-4 rounded-xl border transition-colors",
                  alert.type === "error"
                    ? "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20"
                    : alert.type === "warning"
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20"
                      : "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-medium",
                    alert.type === "error"
                      ? "text-red-800 dark:text-red-300"
                      : alert.type === "warning"
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-blue-800 dark:text-blue-300",
                  )}
                >
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {alert.time}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Role-based content */}
      {(userRole === "ADMIN" || userRole === "OPERATOR") && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Quick Actions
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({userRole === "ADMIN" ? "Admin" : "Operator"} only)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2">
                <Zap className="h-4 w-4" />
                Tambah Perangkat
              </Button>
              <Button variant="secondary" className="gap-2">
                <Activity className="h-4 w-4" />
                Generate Laporan
              </Button>
              {userRole === "ADMIN" && (
                <>
                  <Button variant="outline" className="gap-2">
                    Kelola Pengguna
                  </Button>
                  <Button variant="outline" className="gap-2">
                    Pengaturan Sistem
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
