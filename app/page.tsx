import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Activity,
  Shield,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function Home() {
  const session = await auth();

  // If logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: Activity,
      title: "Real-time Monitoring",
      description:
        "Pantau konsumsi listrik secara langsung dengan data yang diperbarui setiap detik dari sensor IoT.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: BarChart3,
      title: "Analisis & Laporan",
      description:
        "Dapatkan insight mendalam tentang pola penggunaan energi dengan laporan visual yang komprehensif.",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Shield,
      title: "Keamanan & RBAC",
      description:
        "Sistem autentikasi aman dengan kontrol akses berbasis role untuk mengelola tim Anda.",
      gradient: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Energy Monitor
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" asChild>
                <Link href="/login">Masuk</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Daftar</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Sistem Monitoring Modern</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Sistem Monitoring
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Energi Listrik
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Pantau konsumsi listrik secara real-time, analisis pola
              penggunaan, dan optimalkan efisiensi energi dengan dashboard yang
              intuitif dan modern.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/register">
                  Mulai Sekarang
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="/login">Masuk ke Dashboard</Link>
              </Button>
            </div>
          </div>

          {/* Features */}
          <div className="mt-24 grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-0 shadow-lg transition-all hover:shadow-xl"
                >
                  <CardContent className="p-8">
                    <div
                      className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-24">
            <Card className="border-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-xl">
              <CardContent className="grid grid-cols-2 gap-8 p-8 md:grid-cols-4">
                {[
                  { value: "99.9%", label: "Uptime" },
                  { value: "10K+", label: "Perangkat" },
                  { value: "50+", label: "Perusahaan" },
                  { value: "24/7", label: "Support" },
                ].map((stat, index) => (
                  <div key={index} className="text-center text-white">
                    <p className="text-3xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-blue-100">{stat.label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>
            &copy; {new Date().getFullYear()} Energy Monitoring System. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
