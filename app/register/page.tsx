"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Eye,
  EyeOff,
  Loader2,
  User,
  Shield,
  Eye as ViewIcon,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "ADMIN",
    name: "Admin",
    description: "Akses penuh ke semua fitur sistem",
    icon: Shield,
    color: "from-red-500 to-rose-500",
  },
  {
    id: "OPERATOR",
    name: "Operator",
    description: "Dapat mengelola dan memonitor perangkat",
    icon: User,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "VIEWER",
    name: "Viewer",
    description: "Hanya dapat melihat data monitoring",
    icon: ViewIcon,
    color: "from-emerald-500 to-teal-500",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("VIEWER");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Terjadi kesalahan");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="absolute top-0 right-0 p-4">
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold tracking-tight">
                  Energy Monitor
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sistem Monitoring Listrik
                </p>
              </div>
            </Link>
          </div>

          <Card className="border-0 shadow-2xl shadow-black/5">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Buat Akun Baru
              </CardTitle>
              <CardDescription>
                Daftar untuk mulai memonitor energi listrik Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        required
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password"
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-3">
                  <Label>Pilih Role</Label>
                  <div className="grid gap-3">
                    {roles.map((role) => {
                      const Icon = role.icon;
                      const isSelected = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.id)}
                          className={cn(
                            "group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg transition-transform",
                              role.color,
                              isSelected && "scale-110"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold">{role.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            )}
                          >
                            {isSelected && <Check className="h-4 w-4" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Daftar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  Sudah punya akun?{" "}
                </span>
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  Masuk
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Energy Monitoring System
          </p>
        </div>
      </div>
    </div>
  );
}
