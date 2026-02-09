"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Activity,
  Settings,
  Users,
  FileText,
  Bell,
  Gauge,
  ChevronRight,
  ChevronDown,
  Fuel,
  X,
  PanelLeftClose,
  PanelLeft,
  Zap,
  Building2,
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
    name: "Monitoring",
    href: "/dashboard/monitoring",
    icon: Activity,
    roles: ["ADMIN", "OPERATOR", "VIEWER"],
    submenu: [
      {
        name: "Outlet Listrik",
        href: "/dashboard/electricity",
        icon: Zap,
        roles: ["ADMIN", "OPERATOR", "VIEWER"],
      },
      {
        name: "Regional",
        href: "/dashboard/regional",
        icon: Building2,
        roles: ["ADMIN", "OPERATOR", "VIEWER"],
      },
    ],
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
    width: 256,
    transition: {
      duration: 0.3,
      ease: "easeInOut" as const,
    },
  },
  collapsed: {
    width: 72,
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Monitoring"]);

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((name) => name !== menuName)
        : [...prev, menuName],
    );
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
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.name);
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href)) ||
      (hasSubmenu &&
        item.submenu?.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href),
        ));
    const isSubmenuActive =
      hasSubmenu &&
      item.submenu?.some(
        (sub) => pathname === sub.href || pathname.startsWith(sub.href),
      );

    // For items with submenu
    if (hasSubmenu) {
      const submenuContent = (
        <motion.div
          custom={index}
          variants={menuItemVariants}
          initial="initial"
          animate="animate"
        >
          <button
            onClick={() => !collapsed && toggleSubmenu(item.name)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isSubmenuActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <motion.div variants={iconVariants}>
              <Icon className="h-5 w-5 flex-shrink-0" />
            </motion.div>
            {!collapsed && (
              <>
                <motion.span
                  className="flex-1 text-left"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {item.name}
                </motion.span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </motion.div>
              </>
            )}
          </button>
          {/* Submenu items */}
          <AnimatePresence>
            {!collapsed && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-muted pl-3">
                  {item.submenu
                    ?.filter((sub) => sub.roles.includes(userRole))
                    .map((subItem, subIndex) => {
                      const SubIcon = subItem.icon;
                      const isSubActive =
                        pathname === subItem.href ||
                        pathname.startsWith(subItem.href);
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            isSubActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          <SubIcon className="h-4 w-4" />
                          {subItem.name}
                        </Link>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );

      if (collapsed) {
        return (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{submenuContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <div className="space-y-1">
                <p className="font-semibold">{item.name}</p>
                {item.submenu
                  ?.filter((sub) => sub.roles.includes(userRole))
                  .map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      onClick={() => setOpen(false)}
                      className="block text-sm text-muted-foreground hover:text-foreground"
                    >
                      {subItem.name}
                    </Link>
                  ))}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }

      return submenuContent;
    }

    // For regular items without submenu
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
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2",
          )}
        >
          <motion.div variants={iconVariants}>
            <Icon className="h-5 w-5 flex-shrink-0" />
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
              <ChevronRight className="h-4 w-4 opacity-50" />
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
          <div className="flex h-16 items-center gap-3 px-3 border-b">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="h-10 w-10 flex-shrink-0"
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-5 w-5" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5" />
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
                  <h1 className="font-bold tracking-tight whitespace-nowrap">
                    Energy Monitor
                  </h1>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    by protectQube
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
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
          <div className="p-3">
            <motion.div
              className={cn(
                "flex items-center gap-3 rounded-lg bg-muted/50 p-3",
                isCollapsed && "justify-center p-2",
              )}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium">
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
                    <p className="text-sm font-medium truncate">
                      {user?.name || "User"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
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
            className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card lg:hidden"
            variants={mobileMenuVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex h-16 items-center justify-between gap-3 px-4 border-b">
                <div className="flex items-center gap-3">
                  <h1 className="font-bold tracking-tight">Energy Monitor</h1>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {filteredNavItems.map((item, index) => (
                    <NavItem key={item.href} item={item} index={index} />
                  ))}
                </div>
              </nav>

              <Separator />

              {/* User info at bottom */}
              <div className="p-3">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.name || "User"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
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
