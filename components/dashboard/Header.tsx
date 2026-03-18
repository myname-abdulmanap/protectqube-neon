"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import {
  Menu,
  LogOut,
  User,
  Building2,
  ChevronDown,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "@/components/providers/SidebarProvider";
import { useHeaderPage } from "@/components/providers/HeaderPageProvider";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { authToken, authApi } from "@/lib/api";
import { useTenants, useScopes } from "@/lib/use-energy-data";

interface UserData {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  scopeIds?: string[];
}

interface HeaderProps {
  user: UserData;
  selectorValue?: string;
  onSelectorChange?: (value: string) => void;
}

export default function Header({ user }: HeaderProps) {
  const { toggle } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const headerPage = useHeaderPage();

  // ── Data via SWR (cached + deduped across all mounted components) ──
  const { data: tenantList } = useTenants();
  const { data: scopeList } = useScopes();
  const tenants = useMemo(() => tenantList ?? [], [tenantList]);

  // Prevent auto-redirect from firing more than once per mount
  const didAutoRedirect = useRef(false);

  const tenantIdFromPath = useMemo(() => {
    const match = pathname.match(
      /^\/dashboard\/energy-monitoring\/overview\/([^/?#]+)/,
    );
    return match?.[1] || null;
  }, [pathname]);

  // Check if we're on the dashboard overview page (where auto-select should apply)
  const isOnOverviewPage = useMemo(() => {
    return (
      pathname === "/dashboard/energy-monitoring/overview" ||
      pathname === "/dashboard/energy-monitoring/overview/"
    );
  }, [pathname]);

  // Auto-select tenant when landing on /overview without a tenantId.
  // Runs only after SWR data is loaded, and only redirects once per mount (useRef guard).
  useEffect(() => {
    if (didAutoRedirect.current || !isOnOverviewPage || tenantIdFromPath)
      return;
    if (!tenants.length && !scopeList?.length) return; // still loading

    if (scopeList?.length) {
      const scopeTenantId = scopeList[0].tenantId;
      if (scopeTenantId) {
        didAutoRedirect.current = true;
        router.push(`/dashboard/energy-monitoring/overview/${scopeTenantId}`);
        return;
      }
    }

    if (tenants.length === 1) {
      didAutoRedirect.current = true;
      router.push(`/dashboard/energy-monitoring/overview/${tenants[0].id}`);
    }
  }, [isOnOverviewPage, tenantIdFromPath, tenants, scopeList, router]);

  // Derive tenant display name from the already-loaded tenants list — no extra API call
  const tenantName = useMemo(() => {
    if (!tenantIdFromPath) return null;
    const found = tenants.find((t) => t.id === tenantIdFromPath);
    return found?.name ?? null;
  }, [tenantIdFromPath, tenants]);

  const handleTenantSelect = (tenantId: string) => {
    router.push(`/dashboard/energy-monitoring/overview/${tenantId}`);
  };

  const handleLogout = async () => {
    authToken.remove();
    // Use window.location.origin to ensure correct domain in production
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    await signOut({ callbackUrl: `${baseUrl}/login` });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
      case "OPERATOR":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Show tenant selector only if we have multiple tenants or a name to display
  const showTenantDropdown = tenants.length > 1 || !!tenantName;

  // Profile modal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChangePassword = async () => {
    setPwMessage(null);
    if (!oldPassword || !newPassword) {
      setPwMessage({ type: "error", text: "Semua field harus diisi" });
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage({
        type: "error",
        text: "Password baru minimal 6 karakter",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({
        type: "error",
        text: "Konfirmasi password tidak cocok",
      });
      return;
    }
    setPwLoading(true);
    try {
      const res = await authApi.changePassword(oldPassword, newPassword);
      if (res.success) {
        setPwMessage({ type: "success", text: "Password berhasil diubah!" });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwMessage({
          type: "error",
          text: res.error || "Gagal mengubah password",
        });
      }
    } catch {
      setPwMessage({ type: "error", text: "Gagal mengubah password" });
    } finally {
      setPwLoading(false);
    }
  };

  const openProfileModal = () => {
    setPwMessage(null);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-8 items-center justify-between px-1.5 sm:px-2">
        {/* Left: menu + page title + filters */}
        <div className="flex items-center gap-1.5">
          {/* Mobile menu button */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-6 w-6"
              onClick={toggle}
            >
              <Menu className="h-3.5 w-3.5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </motion.div>

          {/* Page title */}
          {headerPage.title && (
            <h1 className="hidden lg:block text-xs font-semibold truncate">
              {headerPage.title}
            </h1>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Page-specific filters */}
          {headerPage.filterSlot}

          {/* Tenant Selector */}
          {showTenantDropdown && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px] border-border/50 bg-muted/30"
                >
                  <Building2 className="h-3 w-3" />
                  {tenantName || "Tenant"}
                  {tenants.length > 1 && (
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              {tenants.length > 1 && (
                <DropdownMenuContent align="end" className="w-48">
                  {tenants.map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.id}
                      className="text-xs"
                      onClick={() => handleTenantSelect(tenant.id)}
                    >
                      {tenant.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          )}

          <ThemeToggle />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-6 w-6 rounded-full p-0 transition-transform hover:scale-105 active:scale-95"
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="bg-primary text-primary-foreground text- [9px] font-medium">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <span
                    className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      user?.role || "VIEWER",
                    )}`}
                  >
                    {user?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={openProfileModal}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              {/* <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Pengaturan
                </Link>
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 dark:text-red-400 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile & Change Password Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil Pengguna
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Info */}
            <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleBadgeColor(
                    user?.role || "VIEWER",
                  )}`}
                >
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Change Password */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Ubah Password</p>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Password Lama</Label>
                  <div className="relative">
                    <Input
                      type={showOldPw ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan password lama"
                      className="h-8 text-xs pr-8"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowOldPw(!showOldPw)}
                    >
                      {showOldPw ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Password Baru</Label>
                  <div className="relative">
                    <Input
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="h-8 text-xs pr-8"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPw(!showNewPw)}
                    >
                      {showNewPw ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Konfirmasi Password Baru</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {pwMessage && (
                <div
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                    pwMessage.type === "success"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                  }`}
                >
                  {pwMessage.type === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                  {pwMessage.text}
                </div>
              )}

              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleChangePassword}
                disabled={pwLoading}
              >
                {pwLoading ? "Menyimpan..." : "Simpan Password Baru"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
