"use client";

import { signOut } from "next-auth/react";
import { Menu, Bell, LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebar } from "@/components/providers/SidebarProvider";
import { HeaderSelector } from "@/components/dashboard/HeaderSelector";
import { motion } from "framer-motion";

interface UserData {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface HeaderProps {
  user: UserData;
  selectorValue?: string;
  onSelectorChange?: (value: string) => void;
}

export default function Header({
  user,
  selectorValue,
  onSelectorChange,
}: HeaderProps) {
  const { toggle } = useSidebar();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
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

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-8 items-center justify-between px-1.5 sm:px-2">
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

        {/* Spacer for desktop */}
        <div className="hidden lg:block" />

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Dynamic Selector */}
          <HeaderSelector
            value={selectorValue}
            onValueChange={onSelectorChange}
          />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="relative h-6 w-6">
              <Bell className="h-3 w-3" />
              <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="sr-only">Notifications</span>
            </Button>
          </motion.div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  className="relative h-6 w-6 rounded-full p-0"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-medium">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </motion.div>
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
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Pengaturan
                </Link>
              </DropdownMenuItem>
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
    </header>
  );
}
