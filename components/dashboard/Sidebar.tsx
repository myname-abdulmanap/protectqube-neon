"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  Bell,
  Gauge,
  Fuel,
  X,
  PanelLeftClose,
  PanelLeft,
  Zap,
  ChevronRight,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSidebar } from "@/components/providers/SidebarProvider";

interface User {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}

interface SidebarProps {
  user: User;
}

// Define navigation items with role-based access
const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "OPERATOR", "VIEWER"],
  },
  {
    name: "Outlet Listrik",
    href: "/dashboard/electricity",
    icon: Zap,
    roles: ["ADMIN", "OPERATOR", "VIEWER"],
  },
  {
    name: "Kitchen Monitor",
    href: "/dashboard/kitchen",
    icon: ChefHat,
    roles: ["ADMIN", "OPERATOR", "VIEWER"],
  },
  {
    name: "Fuel Monitor",
    href: "/dashboard/fuel",
    icon: Fuel,
    roles: ["ADMIN", "OPERATOR", "VIEWER"],
  },
  {
    name: "Perangkat",
    href: "/dashboard/devices",
    icon: Gauge,
    roles: ["ADMIN", "OPERATOR"],
  },
  {
    name: "Laporan",
    href: "/dashboard/reports",
    icon: FileText,
    roles: ["ADMIN", "OPERATOR", "VIEWER"],
  },
  {
    name: "Notifikasi",
    href: "/dashboard/notifications",
    icon: Bell,
    roles: ["ADMIN", "OPERATOR"],
  },
  {
    name: "Pengguna",
    href: "/dashboard/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    name: "Pengaturan",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

// Animation variants
const sidebarVariants = {
  expanded: {
    width: 160,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
  collapsed: {
    width: 44,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
};

const menuItemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut" as const,
    },
  }),
  hover: {
    x: 4,
    transition: {
      duration: 0.2,
    },
  },
};

const iconVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.2,
    rotate: [0, -10, 10, 0],
    transition: {
      duration: 0.3,
    },
  },
  tap: { scale: 0.95 },
};

const mobileMenuVariants = {
  closed: {
    x: "-100%",
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
  open: {
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
};

const overlayVariants = {
  closed: {
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
  open: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, isCollapsed, toggleCollapse, setOpen } = useSidebar();
  const userRole = user?.role || "VIEWER";

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400";
      case "OPERATOR":
        return "text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const NavItem = ({
    item,
    index,
    collapsed = false,
  }: {
    item: (typeof navigationItems)[0];
    index: number;
    collapsed?: boolean;
  }) => {
    const Icon = item.icon;
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    const content = (
      <motion.div
        custom={index}
        variants={menuItemVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
      >
        <Link
          href={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-1.5",
          )}
        >
          <motion.div variants={iconVariants}>
            <Icon className="h-4 w-4 flex-shrink-0" />
          </motion.div>
          {!collapsed && (
            <motion.span
              className="flex-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {item.name}
            </motion.span>
          )}
          {!collapsed && isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-3 w-3 opacity-50" />
            </motion.div>
          )}
        </Link>
      </motion.div>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      {/* Desktop Sidebar */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 hidden border-r bg-card lg:block"
        variants={sidebarVariants}
        initial={false}
        animate={isCollapsed ? "collapsed" : "expanded"}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-8 items-center gap-1.5 px-1.5 border-b">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="h-6 w-6 flex-shrink-0"
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-3.5 w-3.5" />
                  ) : (
                    <PanelLeftClose className="h-3.5 w-3.5" />
                  )}
                </motion.div>
              </Button>
            </motion.div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h1 className="text-xs font-bold tracking-tight whitespace-nowrap">
                    Energy Monitor
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-1.5">
            <div className="space-y-0.5">
              {filteredNavItems.map((item, index) => (
                <NavItem
                  key={item.href}
                  item={item}
                  index={index}
                  collapsed={isCollapsed}
                />
              ))}
            </div>
          </nav>

          <Separator />

          {/* User info at bottom */}
          <div className="p-1.5">
            <motion.div
              className={cn(
                "flex items-center gap-2 rounded-md bg-muted/50 p-1.5",
                isCollapsed && "justify-center p-1",
              )}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-medium">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    className="flex-1 min-w-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-[10px] font-medium truncate">
                      {user?.name || "User"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex px-1 py-0 rounded text-[8px] font-semibold uppercase",
                        getRoleBadge(userRole),
                      )}
                    >
                      {userRole}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-48 border-r bg-card lg:hidden"
            variants={mobileMenuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex h-10 items-center justify-between gap-2 px-2 border-b">
                <h1 className="text-xs font-bold tracking-tight">
                  Energy Monitor
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-1.5">
                <div className="space-y-0.5">
                  {filteredNavItems.map((item, index) => (
                    <NavItem key={item.href} item={item} index={index} />
                  ))}
                </div>
              </nav>

              <Separator />

              {/* User info at bottom */}
              <div className="p-1.5">
                <div className="flex items-center gap-2 rounded-md bg-muted/50 p-1.5">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-medium">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate">
                      {user?.name || "User"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex px-1 py-0 rounded text-[8px] font-semibold uppercase",
                        getRoleBadge(userRole),
                      )}
                    >
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
